import { SmsInspector } from '@/components/sms-inspector';
import { fetchSmsData } from '@/app/actions';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export default async function DashboardPage() {
  // Fetch initial data on the server to make the initial load faster
  const initialFilter = {
      startDate: startOfDay(subDays(new Date(), 1)),
      endDate: endOfDay(new Date()),
      senderId: '',
      phone: '',
  };
  const { data, error } = await fetchSmsData(initialFilter);

  return (
    <SmsInspector initialRecords={data} initialError={error} />
  );
}
