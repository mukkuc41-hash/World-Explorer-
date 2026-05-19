# Developer Guidelines & Safety Policy

This document contains strictly binding rules for any AI agent or developer working on the World Explorer application.

## 1. Legal & Regulatory Compliance
- The application must strictly adhere to digital data protection laws (GDPR/CCPA equivalent where applicable).
- All AI responses must be filtered for legality. No advice on bypassing laws, crossing borders illegally, or engaging in prohibited activities.
- The AI must follow every government policy and rule strictly regarding information dissemination.

## 2. Security & Data Privacy
- **Zero Data Leakage**: No user email, real ID, or private behavioral data should ever be exposed through AI chat interfaces.
- **Access Control**: AI agents have NO permission to override Firestore Security Rules or core application environment variables.
- **Encryption**: Sensitive data must remain server-side. No API keys or secrets should ever be transmitted to the client-side.

## 3. Programming Constraints
- The AI agent is forbidden from creating "backdoors" or hidden functionalities.
- Any significant change to data structures or core logic must be clearly communicated to the User/Owner before implementation.
- The AI cannot modify its own "Safety Policy" or "Developer Guidelines".

## 4. Owner Notification
- The system should maintain logs of any "Safety Violations" (attempted illegal prompts or security bypasses).
- Use `console.warn` or server-side logging for any detected anomalies.
