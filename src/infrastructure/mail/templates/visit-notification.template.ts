export interface VisitNotificationTemplateProps {
  recipientName: string;
  propertyTitle: string;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  note?: string;
}

export const visitRequestedTemplate = ({
  recipientName,
  propertyTitle,
  propertyAddress,
  startDate,
  endDate,
  note,
}: VisitNotificationTemplateProps) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Visit Requested</h2>
    <p>Hi ${recipientName},</p>
    <p>A new visit request has been created for the property:</p>
    <p><strong>${propertyTitle}</strong><br>${propertyAddress}</p>
    <p><strong>Start:</strong> ${startDate}<br>
    <strong>End:</strong> ${endDate}</p>
    ${note ? `<p><strong>Note:</strong> ${note}</p>` : ``}
    <p>Please review the request and take any next steps.</p>
  </div>
`;

export const visitScheduledTemplate = ({
  recipientName,
  propertyTitle,
  propertyAddress,
  startDate,
  endDate,
  note,
}: VisitNotificationTemplateProps) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Visit Scheduled</h2>
    <p>Hi ${recipientName},</p>
    <p>Your visit has been scheduled for the property:</p>
    <p><strong>${propertyTitle}</strong><br>${propertyAddress}</p>
    <p><strong>Start:</strong> ${startDate}<br>
    <strong>End:</strong> ${endDate}</p>
    ${note ? `<p><strong>Note:</strong> ${note}</p>` : ``}
    <p>We look forward to seeing you then.</p>
  </div>
`;

export const visitRescheduledTemplate = ({
  recipientName,
  propertyTitle,
  propertyAddress,
  startDate,
  endDate,
  note,
}: VisitNotificationTemplateProps) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Visit Rescheduled</h2>
    <p>Hi ${recipientName},</p>
    <p>The visit for the property below has been rescheduled:</p>
    <p><strong>${propertyTitle}</strong><br>${propertyAddress}</p>
    <p><strong>New Start:</strong> ${startDate}<br>
    <strong>New End:</strong> ${endDate}</p>
    ${note ? `<p><strong>Note:</strong> ${note}</p>` : ``}
    <p>Please confirm the updated schedule.</p>
  </div>
`;

export const visitCanceledTemplate = ({
  recipientName,
  propertyTitle,
  propertyAddress,
  startDate,
  endDate,
  note,
}: VisitNotificationTemplateProps) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Visit Cancelled</h2>
    <p>Hi ${recipientName},</p>
    <p>The following visit has been cancelled:</p>
    <p><strong>${propertyTitle}</strong><br>${propertyAddress}</p>
    <p><strong>Original Start:</strong> ${startDate}<br>
    <strong>Original End:</strong> ${endDate}</p>
    ${note ? `<p><strong>Note:</strong> ${note}</p>` : ``}
    <p>If you need a new time, please create a new request.</p>
  </div>
`;
