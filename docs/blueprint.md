# **App Name**: SMS Inspector

## Core Features:

- Filter Form: A form with fields for start date, end date, sender ID, and phone number to filter SMS messages, mirroring the UI elements in the provided image.
- API Request: Fetches SMS data from the Premiumy API using the provided URL, headers, request body, and proxy details (IP: 40.81.241.64:3128, username: demo, password: demo).
- Data Table: Displays SMS details in a table format with columns for Datetime, SenderID, B-Number, MCC/MNC, Destination, Range, Rate, Currency, and Message.
- Content Extractor: AI-powered tool that extracts key information (e.g., confirmation codes, links) from the SMS message content.
- Interactive Highlighting: Highlights extracted confirmation codes, or makes links clickable within the SMS message content.
- API Key Management: Stores and manages the Premiumy API key to persist the requests

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and security, in a modern style.
- Background color: Light gray (#EEEEEE) to provide a clean and neutral backdrop.
- Accent color: Teal (#009688) to highlight interactive elements.
- Font pairing: 'Belleza' for headlines (sans-serif), and 'Alegreya' for body text (serif).
- Employs a material design layout with subtle shadows, clear divisions between components, and a modern, spacious feel.
- Use material design icons for common actions and elements.
- Subtle animations for loading states and transitions to enhance user experience.