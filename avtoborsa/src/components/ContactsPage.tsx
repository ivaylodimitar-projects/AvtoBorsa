import React from "react";

const contactsCss = `
  :root { --fg:#111; --muted:#555; --border:#e5e5e5; --bg:#fff; --accent:#0b57d0; }
  .contacts-page { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:var(--fg); background:var(--bg); margin:0; }
  .contacts-page main { max-width: 980px; margin: 0 auto; padding: 24px 18px 64px; line-height: 1.55; }
  .contacts-page h1 { font-size: 28px; margin: 0 0 8px; }
  .contacts-page .meta { color: var(--muted); margin: 0 0 18px; }
  .contacts-page .box { border: 1px solid var(--border); padding: 14px 14px; border-radius: 10px; background: #fafafa; }
  .contacts-page p { margin: 10px 0; }
  .contacts-page a { color: var(--accent); text-decoration: none; }
  .contacts-page a:hover { text-decoration: underline; }
`;

const ContactsPage: React.FC = () => {
  return (
    <div className="contacts-page">
      <style>{contactsCss}</style>
      <main>
        <h1>Контакти</h1>
        <p className="meta">Контактна страница</p>

        <div className="box">
          <p><strong>Лице за контакт:</strong> [Име Фамилия]</p>
          <p><strong>Телефон:</strong> [+359 XX XXX XXXX]</p>
          <p><strong>Адрес:</strong> [Вашият адрес]</p>
          <p><strong>Работно време по телефон:</strong> Понеделник - Петък, 09:00 - 18:00 ч.</p>
          <p><strong>Поддръжка по имейл:</strong> 24/7 (по всяко време).</p>
          <p><strong>Имейл за продажби:</strong> <a href="mailto:sales@kar.bg">sales@kar.bg</a></p>
          <p><strong>Имейл за поддръжка:</strong> <a href="mailto:support@kar.bg">support@kar.bg</a></p>
        </div>
      </main>
    </div>
  );
};

export default ContactsPage;
