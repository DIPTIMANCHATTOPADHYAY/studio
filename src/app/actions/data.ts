'use server';

import { z } from 'zod';
import { format, differenceInDays } from 'date-fns';
import { HttpsProxyAgent } from 'https-proxy-agent';

import connectDB from '@/lib/mongodb';
import { Setting } from '@/lib/models';
import type { SmsRecord, ProxySettings, ExtractedInfo, AccessListRecord, FilterFormValues, AccessListFilterFormValues } from '@/lib/types';

// --- API Helpers ---
async function getApiKey(): Promise<string> {
  await connectDB();
  const apiKeySetting = await Setting.findOne({ key: 'apiKey' });
  return apiKeySetting?.value ?? '';
}

async function getProxyAgent(): Promise<HttpsProxyAgent<string> | undefined> {
    await connectDB();
    const proxySetting = await Setting.findOne({ key: 'proxySettings' });
    if (!proxySetting || !proxySetting.value || !proxySetting.value.ip || !proxySetting.value.port) {
        return undefined;
    }
    const proxy = proxySetting.value as ProxySettings;
    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    const proxyUrl = `http://${auth}${proxy.ip}:${proxy.port}`;
    return new HttpsProxyAgent(proxyUrl);
}

async function getErrorMappings(): Promise<Record<string, string>> {
    try {
        await connectDB();
        const mappingsSetting = await Setting.findOne({ key: 'errorMappings' });
        if (!mappingsSetting || !Array.isArray(mappingsSetting.value)) {
            return {};
        }
        return mappingsSetting.value.reduce((acc, mapping) => {
            if (mapping.reasonCode && mapping.customMessage) {
                acc[mapping.reasonCode] = mapping.customMessage;
            }
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching error mappings:', error);
        return {};
    }
}

async function handleApiError(response: Response): Promise<{ error: string }> {
    const errorText = await response.text();
    try {
        const jsonError = JSON.parse(errorText);
        if (jsonError.error) {
            const reasonCode = jsonError.error.reason_code;
            if (reasonCode) {
                const errorMap = await getErrorMappings();
                const customMessage = errorMap[reasonCode];
                if (customMessage) {
                    return { error: customMessage };
                }
            }
            const message = jsonError.error.message || `An unknown API error occurred. Raw error: ${JSON.stringify(jsonError.error)}`;
            return { error: `API Error: ${message}` };
        }
    } catch (e) {
        // Ignore parsing error, return raw text
    }
    return { error: `API Error: ${response.status} ${response.statusText}. ${errorText}` };
}

// A robust CSV parser that handles newlines and semicolons inside message content.
function parseCsvWithQuotes(input: string): string[][] {
    const rows: string[][] = [];
    let inQuotes = false;
    let row: string[] = [];
    let field = '';
    const text = input.trim();

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i++; // Skip the next quote (escaped quote)
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ';') {
                row.push(field);
                field = '';
            } else if (char === '\n' || char === '\r') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                    i++; // Handle CRLF
                }
            } else {
                field += char;
            }
        }
    }

    // Add the last field and row if the file doesn't end with a newline
    if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(r => r.length > 1 || (r.length === 1 && r[0]));
};

function extractInfoWithoutAI(message: string): ExtractedInfo {
    // Regex for confirmation codes: looks for 4-8 consecutive digits, or a 123-456 pattern.
    const codeRegex = /\b(\d{4,8}|\d{3}-\d{3})\b/g;
    const codes = message.match(codeRegex);
    let confirmationCode = codes ? codes[0] : undefined;

    if (confirmationCode) {
        // Remove any hyphens from the found code.
        confirmationCode = confirmationCode.replace(/-/g, '');
    }

    // Regex for links: finds URLs starting with http or https.
    const linkRegex = /(https?:\/\/[^\s"']+)/g;
    const links = message.match(linkRegex);
    const link = links ? links[0] : undefined;
    
    return { confirmationCode, link };
}

// --- Data Fetching Actions ---

const filterSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  senderId: z.string().optional(),
  phone: z.string().optional(),
}).superRefine(({ startDate, endDate }, ctx) => {
    if (endDate < startDate) {
        ctx.addIssue({
            code: 'custom',
            message: 'End date must be after start date.',
            path: ['endDate'],
        });
        return;
    }
    if (differenceInDays(endDate, startDate) > 1) {
        ctx.addIssue({
            code: 'custom',
            message: 'The date range can be a maximum of two days.',
            path: ['endDate'],
        });
    }
});

export async function fetchSmsData(
  filter: FilterFormValues
): Promise<{ data?: SmsRecord[]; error?: string }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { error: 'API key is not configured. Please set it in the admin panel.' };
  }
  
  const validation = filterSchema.safeParse(filter);
  if (!validation.success) {
    return { error: validation.error.errors.map((e) => e.message).join(', ') };
  }
  
  const agent = await getProxyAgent();

  const API_URL = 'https://api.premiumy.net/v1.0/csv';
  
  const apiFilter: { [key: string]: string | undefined } = {
    start_date: format(filter.startDate!, 'yyyy-MM-dd HH:mm:ss'),
    end_date: format(filter.endDate!, 'yyyy-MM-dd HH:mm:ss'),
  };

  if (filter.senderId) {
    apiFilter.senderid = filter.senderId;
  }
  if (filter.phone) {
    apiFilter.phone = filter.phone;
  }

  const body = {
    id: null,
    jsonrpc: '2.0',
    method: 'sms.mdr_full:get_list',
    params: {
      filter: apiFilter,
      page: 1,
      per_page: 100,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
      agent,
    });

    if (!response.ok) {
        return handleApiError(response);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim() === '') {
        return { data: [] };
    }
    
    if (csvText.trim().startsWith('{')) {
        const clonedResponse = new Response(csvText, response);
        return handleApiError(clonedResponse);
    }
    
    const allRows = parseCsvWithQuotes(csvText);

    if (allRows.length < 2) {
      return { data: [] };
    }

    const headers = allRows[0].map(h => h.trim().toLowerCase());
    const dataRows = allRows.slice(1);
    const records: SmsRecord[] = [];

    const columnMap: { [key in keyof Omit<SmsRecord, 'extractedInfo'>]?: number } = {
        dateTime: headers.indexOf('datetime'),
        senderId: headers.indexOf('senderid'),
        phone: headers.indexOf('b-number'),
        mccMnc: headers.indexOf('mcc/mnc'),
        destination: headers.indexOf('destination'),
        rate: headers.indexOf('rate'),
        currency: headers.indexOf('currency'),
        message: headers.indexOf('message'),
    };
    
    if (columnMap.dateTime === -1 || columnMap.message === -1) {
        return { error: "CSV response is missing required columns ('datetime', 'message')." };
    }
    
    for (const parts of dataRows) {
        if (parts.length <= columnMap.message!) {
            continue; // Skip malformed rows
        }

        const message = parts[columnMap.message!];
        const extractedInfo = extractInfoWithoutAI(message);

        records.push({
            dateTime: parts[columnMap.dateTime!],
            senderId: parts[columnMap.senderId!],
            phone: parts[columnMap.phone!],
            mccMnc: parts[columnMap.mccMnc!],
            destination: parts[columnMap.destination!],
            rate: parts[columnMap.rate!],
            currency: parts[columnMap.currency!],
            message: message,
            extractedInfo,
        });
    }
    
    return { data: records };
  } catch (err) {
    const error = err as Error;
    console.error('Failed to fetch SMS data:', error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}

export async function fetchAccessListData(
  formValues: AccessListFilterFormValues
): Promise<{ data?: AccessListRecord[]; error?: string }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { error: 'API key is not configured. Please set it in the admin panel.' };
  }
  
  const agent = await getProxyAgent();
  const API_URL = 'https://api.premiumy.net/v1.0/csv';
  
  const accessListApiFilter: { [key: string]: any } = {
    cur_key: 1,
    sp_key_list: null,
  };

  if (formValues.origin) {
    accessListApiFilter.origin = formValues.origin;
  }
  if (formValues.destination) {
    accessListApiFilter.destination = formValues.destination;
  }
  if (formValues.message) {
    accessListApiFilter.message = formValues.message;
  }

  const body = {
    id: null,
    jsonrpc: '2.0',
    method: 'sms.access_list__get_list:account_price',
    params: {
      filter: accessListApiFilter,
      page: 1,
      per_page: 100,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
      agent,
    });

    if (!response.ok) {
       return handleApiError(response);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim() === '') {
        return { data: [] };
    }
    
    if (csvText.trim().startsWith('{')) {
        const clonedResponse = new Response(csvText, response);
        return handleApiError(clonedResponse);
    }

    const allRows = parseCsvWithQuotes(csvText);

    if (allRows.length < 2) {
      return { data: [] };
    }

    const headers = allRows[0].map(h => h.trim().toLowerCase());
    const dataRows = allRows.slice(1);
    const records: AccessListRecord[] = [];

    const columnMap = {
        price: headers.indexOf('price'),
        accessOrigin: headers.indexOf('access origin'),
        accessDestination: headers.indexOf('access destination'),
        testNumber: headers.indexOf('test number'),
        rate: headers.indexOf('rate'),
        currency: headers.indexOf('currency'),
        comment: headers.indexOf('comment'),
        message: headers.indexOf('message'),
        limitHour: headers.indexOf('limit hour'),
        limitDay: headers.indexOf('limit day'),
        datetime: headers.indexOf('datetime'),
    };
    
    if (columnMap.accessOrigin === -1) {
        return { error: "CSV response is missing required column ('access origin')." };
    }
    
    for (const parts of dataRows) {
        records.push({
            price: parts[columnMap.price!],
            accessOrigin: parts[columnMap.accessOrigin!],
            accessDestination: parts[columnMap.accessDestination!],
            testNumber: parts[columnMap.testNumber!],
            rate: parts[columnMap.rate!],
            currency: parts[columnMap.currency!],
            comment: parts[columnMap.comment!],
            message: parts[columnMap.message!],
            limitHour: parts[columnMap.limitHour!],
            limitDay: parts[columnMap.limitDay!],
            datetime: parts[columnMap.datetime!],
        });
    }
    
    return { data: records };
  } catch (err) {
    const error = err as Error;
    console.error('Failed to fetch access list data:', error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}
