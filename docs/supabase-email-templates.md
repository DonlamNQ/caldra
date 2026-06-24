# Templates d'emails Caldra (Supabase Auth)

Les emails d'authentification (« Confirm your signup », etc.) sont gérés par **Supabase**, pas par le code de l'app. Ils se personnalisent dans :

**Supabase Dashboard → Authentication → Emails → Templates**

Pour chaque template ci-dessous : copie le bloc HTML dans le champ **Message body**, et mets le **Subject** indiqué. Les variables `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}` sont remplies par Supabase.

> Pense aussi à régler **Authentication → URL Configuration** : Site URL = `https://getcaldra.com`.

Palette : fond `#08080d`, carte `#0f0f16`, accent `#7c3aed`, texte `#e8e6e0`.

---

## 1. Confirm signup (confirmation d'inscription)

**Subject :** `Confirme ton compte Caldra`

```html
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#08080d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080d;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#7c3aed,transparent);"></td></tr>
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:16px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#fff;">CALD<span style="color:#7c3aed;">RA</span></div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff;text-align:center;">Bienvenue</h1>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(232,230,224,.6);text-align:center;">
            Plus qu'une étape : confirme ton adresse email pour activer ton compte et démarrer ton essai de 7 jours.
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px;text-align:center;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
            Confirmer mon email →
          </a>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(232,230,224,.3);text-align:center;">
            Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>
            <a href="{{ .ConfirmationURL }}" style="color:#7c3aed;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
          <p style="margin:0;font-size:11px;color:rgba(232,230,224,.25);text-align:center;">
            Tu n'as pas créé de compte Caldra ? Ignore simplement cet email.
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(232,230,224,.2);">Caldra · Intelligence comportementale pour traders</p>
    </td></tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link (connexion par lien)

**Subject :** `Ton lien de connexion Caldra`

```html
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#08080d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080d;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#7c3aed,transparent);"></td></tr>
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:16px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#fff;">CALD<span style="color:#7c3aed;">RA</span></div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff;text-align:center;">Connexion à Caldra</h1>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(232,230,224,.6);text-align:center;">
            Clique sur le bouton ci-dessous pour te connecter. Ce lien expire dans 1 heure.
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px;text-align:center;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
            Me connecter →
          </a>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(232,230,224,.3);text-align:center;">
            Lien direct :<br>
            <a href="{{ .ConfirmationURL }}" style="color:#7c3aed;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
          <p style="margin:0;font-size:11px;color:rgba(232,230,224,.25);text-align:center;">
            Tu n'as pas demandé ce lien ? Ignore cet email, ton compte reste protégé.
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(232,230,224,.2);">Caldra · Intelligence comportementale pour traders</p>
    </td></tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password (réinitialisation du mot de passe)

**Subject :** `Réinitialise ton mot de passe Caldra`

```html
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#08080d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080d;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#7c3aed,transparent);"></td></tr>
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:16px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#fff;">CALD<span style="color:#7c3aed;">RA</span></div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff;text-align:center;">Mot de passe oublié ?</h1>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(232,230,224,.6);text-align:center;">
            Clique ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 1 heure.
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px;text-align:center;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
            Réinitialiser mon mot de passe →
          </a>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(232,230,224,.3);text-align:center;">
            Lien direct :<br>
            <a href="{{ .ConfirmationURL }}" style="color:#7c3aed;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
          <p style="margin:0;font-size:11px;color:rgba(232,230,224,.25);text-align:center;">
            Tu n'as pas demandé ça ? Ignore cet email, ton mot de passe reste inchangé.
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(232,230,224,.2);">Caldra · Intelligence comportementale pour traders</p>
    </td></tr>
  </table>
</body>
</html>
```

---

## 4. Change Email Address (changement d'email)

**Subject :** `Confirme ta nouvelle adresse email`

```html
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#08080d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080d;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#7c3aed,transparent);"></td></tr>
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:16px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#fff;">CALD<span style="color:#7c3aed;">RA</span></div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff;text-align:center;">Changement d'email</h1>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(232,230,224,.6);text-align:center;">
            Confirme que <strong style="color:#e8e6e0;">{{ .Email }}</strong> est bien ta nouvelle adresse pour ton compte Caldra.
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px;text-align:center;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
            Confirmer cette adresse →
          </a>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(232,230,224,.3);text-align:center;">
            Lien direct :<br>
            <a href="{{ .ConfirmationURL }}" style="color:#7c3aed;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
          <p style="margin:0;font-size:11px;color:rgba(232,230,224,.25);text-align:center;">
            Tu n'es pas à l'origine de ce changement ? Contacte-nous immédiatement.
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(232,230,224,.2);">Caldra · Intelligence comportementale pour traders</p>
    </td></tr>
  </table>
</body>
</html>
```

---

## 5. Invite user (invitation)

**Subject :** `Tu es invité·e sur Caldra`

```html
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#08080d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080d;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#7c3aed,transparent);"></td></tr>
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:16px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#fff;">CALD<span style="color:#7c3aed;">RA</span></div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff;text-align:center;">Tu es invité·e</h1>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(232,230,224,.6);text-align:center;">
            Rejoins Caldra et laisse l'outil surveiller chaque trade en temps réel pour t'éviter les décisions impulsives.
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px;text-align:center;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;">
            Accepter l'invitation →
          </a>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
          <p style="margin:0;font-size:11px;color:rgba(232,230,224,.25);text-align:center;">
            Tu ne connais pas Caldra ? Ignore simplement cet email.
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(232,230,224,.2);">Caldra · Intelligence comportementale pour traders</p>
    </td></tr>
  </table>
</body>
</html>
```

---

## 6. Reauthentication (code de confirmation)

⚠️ Ce template utilise `{{ .Token }}` (code à 6 chiffres), **pas** `{{ .ConfirmationURL }}`. Supabase envoie un code OTP, pas un lien.

**Subject :** `Ton code de confirmation Caldra`

```html
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#08080d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080d;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f16;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#7c3aed,transparent);"></td></tr>
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:16px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#fff;">CALD<span style="color:#7c3aed;">RA</span></div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff;text-align:center;">Confirme ton identité</h1>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(232,230,224,.6);text-align:center;">
            Saisis ce code pour confirmer ton action. Il expire dans quelques minutes.
          </p>
        </td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <div style="display:inline-block;background:#08080d;border:1px solid rgba(124,58,237,.4);border-radius:10px;padding:18px 32px;font-size:32px;font-weight:700;letter-spacing:10px;color:#fff;">
            {{ .Token }}
          </div>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(232,230,224,.3);text-align:center;">
            Ne partage jamais ce code. L'équipe Caldra ne te le demandera jamais.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
          <p style="margin:0;font-size:11px;color:rgba(232,230,224,.25);text-align:center;">
            Tu n'es pas à l'origine de cette demande ? Ignore cet email.
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(232,230,224,.2);">Caldra · Intelligence comportementale pour traders</p>
    </td></tr>
  </table>
</body>
</html>
```
