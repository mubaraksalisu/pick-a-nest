export const verificationEmailTemplate = (verificationLink: string) => `
  <h1>Verify Your Email</h1>

  <p>
    Thanks for signing up.
  </p>

  <p>
    Click the button below to verify your email.
  </p>

  <a
    href="${verificationLink}"
    style="
      background:#000;
      color:#fff;
      padding:12px 24px;
      text-decoration:none;
      border-radius:6px;
    "
  >
    Verify Email
  </a>
`;
