import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Replace with your verified Resend "from" email or set in .env
const EMAIL_FOOTER_IMAGE_URL = process.env.EMAIL_FOOTER_URL || 'https://placehold.co/600x100/0B1C3D/FFFFFF/png?text=Your+Company+Logo+Here'; // Replace with your actual public image URL or set in .env

export async function POST(request) {
  try {
    const { emailTo, subject, fortuneText, fullName } = await request.json();

    if (!emailTo || !subject || !fortuneText) {
      return NextResponse.json({ message: 'Missing required fields: emailTo, subject, or fortuneText' }, { status: 400 });
    }

    // Modify CTA in the fortune text
    const modifiedFortuneText = fortuneText.replace(
      /Learn more about Moving Walls:/gi, 
      'Book an appointment here:'
    );

    // Prepare HTML content for the email
    // Split by one or more newlines and wrap each part in <p> tags for better paragraph formatting
    const fortuneParagraphs = modifiedFortuneText
      .split(/\n+/)
      .filter(paragraph => paragraph.trim() !== '')
      .map(paragraph => `<p>${paragraph.trim()}</p>`).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 5px; }
            .header { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; }
            .fortune-text { margin-bottom: 20px; }
            .footer-image { width: 100%; max-width: 600px; height: auto; margin-top: 20px; }
            .signature { margin-top: 20px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="container">
            <p class="header">Hello ${fullName || 'there'},</p>
            <p>✨ Here's your business fortune as requested:</p>
            <div class="fortune-text">
              ${fortuneParagraphs}
            </div>
            <p class="signature">
              Best regards,<br />
              Your AI Fortune Teller at Moving Walls 🚀
            </p>
            <img src="${EMAIL_FOOTER_IMAGE_URL}" alt="Email Footer" class="footer-image" />
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: `Moving Walls Fortune Teller <${FROM_EMAIL}>`,
      to: ['salman.malik@movingwalls.com'], // Temporarily hardcoded for testing
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API Error Details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ message: 'Error sending email', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Email sent successfully', data: data }, { status: 200 });
  } catch (error) {
    console.error('API Route Exception Details:', JSON.stringify(error, null, 2));
    if (error.stack) {
      console.error('Stack Trace:', error.stack);
    }
    return NextResponse.json({ message: 'Error processing request', error: error.message }, { status: 500 });
  }
}