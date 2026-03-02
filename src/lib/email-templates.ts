// Email Templates for Habinex
// These templates are designed for use with Resend and can be activated in the future

export type EmailType = 
  | "welcome"
  | "email_confirmation"
  | "new_message"
  | "new_inquiry"
  | "property_inquiry_received"
  | "high_views"
  | "new_recommendation"
  | "weekly_digest"
  | "password_reset"
  | "account_verified"
  | "listing_published"
  | "listing_expired"
  | "price_drop_alert"
  | "saved_search_match"
  | "reengagement";

export interface EmailTemplateData {
  recipientName: string;
  language?: "fr" | "en";
  [key: string]: any;
}

// Base email wrapper with consistent styling
const baseEmailWrapper = (content: string, previewText: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Habynex</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .button {padding: 12px 30px !important;}
  </style>
  <![endif]-->
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
    &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>
  
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
    ${content}
  </div>
  
  <!-- Footer -->
  <div style="max-width: 600px; margin: 20px auto 0; text-align: center;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} Habynex. Tous droits réservés.
    </p>
    <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0;">
      <a href="https://Habynex.com/unsubscribe" style="color: #9ca3af;">Se désabonner</a> · 
      <a href="https://Habynex.com/preferences" style="color: #9ca3af;">Préférences</a>
    </p>
  </div>
</body>
</html>
`;

// Gradient header component
const gradientHeader = (title: string, emoji: string, gradientColors: string = "#3b82f6, #1d4ed8") => `
<div style="background: linear-gradient(135deg, ${gradientColors}); padding: 40px 30px; text-align: center;">
  <div style="font-size: 48px; margin-bottom: 10px;">${emoji}</div>
  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">${title}</h1>
</div>
`;

// Button component
const primaryButton = (text: string, url: string, gradientColors: string = "#3b82f6, #1d4ed8") => `
<a href="${url}" style="display: inline-block; background: linear-gradient(135deg, ${gradientColors}); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">${text}</a>
`;

// =====================================================
// EMAIL TEMPLATES
// =====================================================

export const emailTemplates = {
  // Welcome email for new users
  welcome: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr ? "🏠 Bienvenue sur Habynex !" : "🏠 Welcome to Habynex!",
      html: baseEmailWrapper(`
        ${gradientHeader("Habynex", "🏠")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">
            ${isFr ? `Bienvenue ${data.recipientName} !` : `Welcome ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.7;">
            ${isFr 
              ? "Nous sommes ravis de vous accueillir dans la communauté Habynex. Vous avez fait le premier pas vers votre futur chez-vous !" 
              : "We're thrilled to welcome you to the Habynex community. You've taken the first step toward your future home!"}
          </p>
          
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 18px;">
              ${isFr ? "🚀 Prochaines étapes" : "🚀 Next Steps"}
            </h3>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 20px; line-height: 2;">
              <li>${isFr ? "Complétez votre profil" : "Complete your profile"}</li>
              <li>${isFr ? "Définissez vos préférences de recherche" : "Set your search preferences"}</li>
              <li>${isFr ? "Explorez les annonces vérifiées" : "Explore verified listings"}</li>
              <li>${isFr ? "Activez les alertes pour ne rien manquer" : "Enable alerts to stay updated"}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Découvrir les annonces" : "Browse Listings",
              "https://Habynex.com/search"
            )}
          </div>
        </div>
      `, isFr ? "Bienvenue sur Habynex ! Commencez votre recherche immobilière." : "Welcome to Habynex! Start your property search.")
    };
  },

  // Email confirmation
  email_confirmation: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr ? "✉️ Confirmez votre adresse email" : "✉️ Confirm your email address",
      html: baseEmailWrapper(`
        ${gradientHeader("Vérification Email", "✉️", "#10b981, #059669")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Bonjour ${data.recipientName} !` : `Hello ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.7;">
            ${isFr 
              ? "Merci de vous être inscrit sur Habynex. Pour sécuriser votre compte et accéder à toutes les fonctionnalités, veuillez confirmer votre adresse email." 
              : "Thank you for signing up on Habynex. To secure your account and access all features, please confirm your email address."}
          </p>
          
          <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="color: #166534; font-size: 14px; margin: 0;">
              ${isFr ? "Ce lien expire dans 24 heures" : "This link expires in 24 hours"}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Confirmer mon email" : "Confirm my email",
              data.confirmationUrl || "https://Habynex.com/confirm",
              "#10b981, #059669"
            )}
          </div>
          
          <p style="color: #9ca3af; font-size: 13px; margin-top: 30px; text-align: center;">
            ${isFr 
              ? "Si vous n'avez pas créé de compte, vous pouvez ignorer cet email." 
              : "If you didn't create an account, you can ignore this email."}
          </p>
        </div>
      `, isFr ? "Confirmez votre email pour activer votre compte Habynex" : "Confirm your email to activate your Habynex account")
    };
  },

  // New message notification
  new_message: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr 
        ? `💬 Nouveau message de ${data.senderName}` 
        : `💬 New message from ${data.senderName}`,
      html: baseEmailWrapper(`
        ${gradientHeader("Nouveau Message", "💬")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Bonjour ${data.recipientName} !` : `Hello ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? `Vous avez reçu un nouveau message de <strong>${data.senderName}</strong> concernant :` 
              : `You received a new message from <strong>${data.senderName}</strong> about:`}
          </p>
          
          <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #1f2937; font-weight: 600; margin: 0; font-size: 16px;">
              📍 ${data.propertyTitle}
            </p>
          </div>
          
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 12px 12px 0; margin: 25px 0;">
            <p style="color: #1e40af; margin: 0; font-style: italic; font-size: 15px; line-height: 1.6;">
              "${data.messagePreview?.substring(0, 200)}${data.messagePreview && data.messagePreview.length > 200 ? '...' : ''}"
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Répondre au message" : "Reply to message",
              "https://Habynex.com/messages"
            )}
          </div>
        </div>
      `, isFr ? `${data.senderName} vous a envoyé un message sur Habynex` : `${data.senderName} sent you a message on Habynex`)
    };
  },

  // Property inquiry received (for owners)
  property_inquiry_received: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr 
        ? `🔔 Nouvelle demande pour "${data.propertyTitle}"` 
        : `🔔 New inquiry for "${data.propertyTitle}"`,
      html: baseEmailWrapper(`
        ${gradientHeader("Nouvelle Demande", "🔔", "#8b5cf6, #7c3aed")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Bonne nouvelle ${data.recipientName} !` : `Great news ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? "Quelqu'un est intéressé par votre bien !" 
              : "Someone is interested in your property!"}
          </p>
          
          <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #7c3aed; margin: 0 0 15px 0;">📍 ${data.propertyTitle}</h3>
            <div style="border-top: 1px solid #e9d5ff; padding-top: 15px; margin-top: 15px;">
              <p style="margin: 8px 0; color: #6b21a8;">
                <strong>${isFr ? "De:" : "From:"}</strong> ${data.inquirerName}
              </p>
              ${data.inquirerPhone ? `
              <p style="margin: 8px 0; color: #6b21a8;">
                <strong>${isFr ? "Téléphone:" : "Phone:"}</strong> ${data.inquirerPhone}
              </p>
              ` : ''}
              ${data.moveInDate ? `
              <p style="margin: 8px 0; color: #6b21a8;">
                <strong>${isFr ? "Date souhaitée:" : "Move-in date:"}</strong> ${data.moveInDate}
              </p>
              ` : ''}
            </div>
          </div>
          
          ${data.inquiryMessage ? `
          <div style="background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 0 12px 12px 0; margin: 20px 0;">
            <p style="color: #581c87; margin: 0; font-style: italic;">
              "${data.inquiryMessage}"
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Répondre maintenant" : "Reply now",
              "https://Habynex.com/messages",
              "#8b5cf6, #7c3aed"
            )}
          </div>
          
          <p style="color: #6b7280; font-size: 13px; margin-top: 25px; text-align: center;">
            💡 ${isFr 
              ? "Répondez rapidement pour augmenter vos chances de conclure !" 
              : "Reply quickly to increase your chances of closing!"}
          </p>
        </div>
      `, isFr ? "Nouvelle demande pour votre annonce sur Habynex" : "New inquiry for your listing on Habynex")
    };
  },

  // High views milestone
  high_views: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr 
        ? `🔥 Votre annonce atteint ${data.viewCount} vues !` 
        : `🔥 Your listing reached ${data.viewCount} views!`,
      html: baseEmailWrapper(`
        ${gradientHeader("Annonce Populaire !", "🔥", "#f59e0b, #d97706")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Félicitations ${data.recipientName} ! 🎉` : `Congratulations ${data.recipientName}! 🎉`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? "Votre annonce attire beaucoup d'attention !" 
              : "Your listing is getting a lot of attention!"}
          </p>
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 30px; margin: 25px 0; text-align: center;">
            <p style="color: #92400e; font-size: 56px; font-weight: 800; margin: 0; line-height: 1;">${data.viewCount}</p>
            <p style="color: #b45309; font-weight: 600; margin: 8px 0 0 0; font-size: 18px;">
              ${isFr ? "vues totales" : "total views"}
            </p>
          </div>
          
          <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #92400e; font-weight: 600; margin: 0;">📍 ${data.propertyTitle}</p>
          </div>
          
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            ${isFr 
              ? "Continuez ainsi ! Plus votre annonce est vue, plus vous avez de chances de trouver le locataire ou l'acheteur idéal." 
              : "Keep it up! The more your listing is viewed, the better your chances of finding the ideal tenant or buyer."}
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Voir mes statistiques" : "View my statistics",
              "https://Habynex.com/dashboard",
              "#f59e0b, #d97706"
            )}
          </div>
        </div>
      `, isFr ? `Votre annonce a atteint ${data.viewCount} vues !` : `Your listing reached ${data.viewCount} views!`)
    };
  },

  // New property recommendation
  new_recommendation: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr 
        ? "✨ Une nouvelle propriété qui pourrait vous plaire" 
        : "✨ A new property you might like",
      html: baseEmailWrapper(`
        ${gradientHeader("Recommandation", "✨", "#ec4899, #db2777")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Bonjour ${data.recipientName} !` : `Hello ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? "Nous avons trouvé une propriété qui correspond à vos critères !" 
              : "We found a property that matches your criteria!"}
          </p>
          
          ${data.propertyImage ? `
          <div style="margin: 25px 0; border-radius: 12px; overflow: hidden;">
            <img src="${data.propertyImage}" alt="${data.propertyTitle}" style="width: 100%; height: 200px; object-fit: cover;">
          </div>
          ` : ''}
          
          <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 12px; padding: 25px; margin: 20px 0;">
            <h3 style="color: #be185d; margin: 0 0 10px 0;">${data.propertyTitle}</h3>
            <p style="color: #9d174d; font-size: 24px; font-weight: 700; margin: 10px 0;">
              ${data.propertyPrice} FCFA
              <span style="font-size: 14px; font-weight: 400;">/${isFr ? "mois" : "month"}</span>
            </p>
            <p style="color: #831843; margin: 10px 0 0 0; font-size: 14px;">
              📍 ${data.propertyLocation}
            </p>
            ${data.propertyBedrooms ? `
            <p style="color: #831843; margin: 5px 0 0 0; font-size: 14px;">
              🛏️ ${data.propertyBedrooms} ${isFr ? "chambres" : "bedrooms"} · 
              🚿 ${data.propertyBathrooms} ${isFr ? "salles de bain" : "bathrooms"}
            </p>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Voir cette propriété" : "View this property",
              data.propertyUrl || "https://Habynex.com/search",
              "#ec4899, #db2777"
            )}
          </div>
        </div>
      `, isFr ? "Nouvelle recommandation immobilière pour vous" : "New property recommendation for you")
    };
  },

  // Weekly digest
  weekly_digest: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr 
        ? "📊 Votre résumé hebdomadaire Habynex" 
        : "📊 Your weekly Habynex summary",
      html: baseEmailWrapper(`
        ${gradientHeader("Résumé Hebdomadaire", "📊", "#6366f1, #4f46e5")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Bonjour ${data.recipientName} !` : `Hello ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? "Voici ce qui s'est passé cette semaine sur Habynex." 
              : "Here's what happened this week on Habynex."}
          </p>
          
          <!-- Stats Grid -->
          <div style="display: flex; gap: 15px; margin: 25px 0; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px; background: #eef2ff; border-radius: 12px; padding: 20px; text-align: center;">
              <p style="color: #4338ca; font-size: 32px; font-weight: 700; margin: 0;">${data.newListings || 0}</p>
              <p style="color: #6366f1; font-size: 12px; margin: 5px 0 0 0;">${isFr ? "Nouvelles annonces" : "New listings"}</p>
            </div>
            <div style="flex: 1; min-width: 120px; background: #fef3c7; border-radius: 12px; padding: 20px; text-align: center;">
              <p style="color: #b45309; font-size: 32px; font-weight: 700; margin: 0;">${data.totalViews || 0}</p>
              <p style="color: #d97706; font-size: 12px; margin: 5px 0 0 0;">${isFr ? "Vues sur vos annonces" : "Views on your listings"}</p>
            </div>
            <div style="flex: 1; min-width: 120px; background: #dcfce7; border-radius: 12px; padding: 20px; text-align: center;">
              <p style="color: #15803d; font-size: 32px; font-weight: 700; margin: 0;">${data.newMessages || 0}</p>
              <p style="color: #22c55e; font-size: 12px; margin: 5px 0 0 0;">${isFr ? "Nouveaux messages" : "New messages"}</p>
            </div>
          </div>
          
          ${data.topListings && data.topListings.length > 0 ? `
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">
              🏆 ${isFr ? "Vos annonces les plus vues" : "Your top viewed listings"}
            </h3>
            ${data.topListings.map((listing: any) => `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #334155;">${listing.title}</span>
                <span style="color: #6366f1; font-weight: 600;">${listing.views} ${isFr ? "vues" : "views"}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Voir mon tableau de bord" : "View my dashboard",
              "https://Habynex.com/dashboard",
              "#6366f1, #4f46e5"
            )}
          </div>
        </div>
      `, isFr ? "Votre résumé hebdomadaire sur Habynex" : "Your weekly summary on Habynex")
    };
  },

  // Account verified
  account_verified: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    const levelNames: Record<string, { fr: string; en: string }> = {
      level_1: { fr: "Niveau 1 - Basique", en: "Level 1 - Basic" },
      level_2: { fr: "Niveau 2 - Standard", en: "Level 2 - Standard" },
      level_3: { fr: "Niveau 3 - Avancé", en: "Level 3 - Advanced" },
      level_4: { fr: "Niveau 4 - Premium", en: "Level 4 - Premium" },
    };
    const levelName = levelNames[data.verificationLevel] || levelNames.level_1;
    
    return {
      subject: isFr 
        ? `✅ Félicitations ! ${levelName.fr} validé` 
        : `✅ Congratulations! ${levelName.en} validated`,
      html: baseEmailWrapper(`
        ${gradientHeader("Compte Vérifié !", "✅", "#10b981, #059669")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Bravo ${data.recipientName} ! 🎊` : `Well done ${data.recipientName}! 🎊`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? `Votre compte a été vérifié avec succès au ${levelName.fr}.` 
              : `Your account has been successfully verified at ${levelName.en}.`}
          </p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">🏅</div>
            <p style="color: #047857; font-weight: 700; font-size: 20px; margin: 0;">
              ${isFr ? levelName.fr : levelName.en}
            </p>
            <p style="color: #10b981; font-size: 14px; margin: 10px 0 0 0;">
              ${isFr ? "Nouveau score de confiance:" : "New trust score:"} <strong>${data.trustScore}%</strong>
            </p>
          </div>
          
          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">
              ${isFr ? "Avantages débloqués" : "Unlocked benefits"}
            </h3>
            <ul style="color: #15803d; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>${isFr ? "Badge de confiance sur votre profil" : "Trust badge on your profile"}</li>
              <li>${isFr ? "Visibilité accrue de vos annonces" : "Increased visibility of your listings"}</li>
              <li>${isFr ? "Accès prioritaire aux nouvelles fonctionnalités" : "Priority access to new features"}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Voir mon profil" : "View my profile",
              "https://Habynex.com/profile",
              "#10b981, #059669"
            )}
          </div>
        </div>
      `, isFr ? `Votre compte est maintenant vérifié au ${levelName.fr}` : `Your account is now verified at ${levelName.en}`)
    };
  },

  // Listing published
  listing_published: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr 
        ? `🎉 Votre annonce "${data.propertyTitle}" est en ligne !` 
        : `🎉 Your listing "${data.propertyTitle}" is live!`,
      html: baseEmailWrapper(`
        ${gradientHeader("Annonce Publiée !", "🎉", "#22c55e, #16a34a")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Excellente nouvelle ${data.recipientName} !` : `Great news ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? "Votre annonce est maintenant visible par des milliers de chercheurs de logement !" 
              : "Your listing is now visible to thousands of property seekers!"}
          </p>
          
          ${data.propertyImage ? `
          <div style="margin: 25px 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <img src="${data.propertyImage}" alt="${data.propertyTitle}" style="width: 100%; height: 200px; object-fit: cover;">
          </div>
          ` : ''}
          
          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #166534; margin: 0 0 10px 0;">${data.propertyTitle}</h3>
            <p style="color: #22c55e; font-size: 20px; font-weight: 700; margin: 0;">
              ${data.propertyPrice} FCFA
            </p>
          </div>
          
          <div style="background: #fefce8; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #a16207; margin: 0 0 10px 0;">
              💡 ${isFr ? "Conseils pour plus de visibilité" : "Tips for more visibility"}
            </h4>
            <ul style="color: #854d0e; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
              <li>${isFr ? "Ajoutez plus de photos de qualité" : "Add more quality photos"}</li>
              <li>${isFr ? "Répondez rapidement aux messages" : "Reply quickly to messages"}</li>
              <li>${isFr ? "Gardez votre annonce à jour" : "Keep your listing up to date"}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Voir mon annonce" : "View my listing",
              data.propertyUrl || "https://Habynex.com/dashboard",
              "#22c55e, #16a34a"
            )}
          </div>
        </div>
      `, isFr ? "Votre annonce est maintenant en ligne sur Habynex" : "Your listing is now live on Habynex")
    };
  },

  // Re-engagement email
  reengagement: (data: EmailTemplateData) => {
    const isFr = data.language !== "en";
    return {
      subject: isFr 
        ? `👋 ${data.recipientName}, vous nous manquez !` 
        : `👋 ${data.recipientName}, we miss you!`,
      html: baseEmailWrapper(`
        ${gradientHeader("Vous nous manquez !", "👋", "#f43f5e, #e11d48")}
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isFr ? `Bonjour ${data.recipientName} !` : `Hello ${data.recipientName}!`}
          </h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isFr 
              ? "Cela fait un moment que nous ne vous avons pas vu sur Habynex. Beaucoup de choses ont changé !" 
              : "It's been a while since we've seen you on Habynex. A lot has changed!"}
          </p>
          
          <div style="background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #be123c; margin: 0 0 15px 0;">
              ${isFr ? "Depuis votre dernière visite :" : "Since your last visit:"}
            </h3>
            <ul style="color: #9f1239; margin: 0; padding-left: 20px; line-height: 2;">
              <li>${data.newListingsCount || "50+"} ${isFr ? "nouvelles propriétés ajoutées" : "new properties added"}</li>
              <li>${isFr ? "Nouvelles fonctionnalités de recherche" : "New search features"}</li>
              <li>${isFr ? "Interface améliorée" : "Improved interface"}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            ${primaryButton(
              isFr ? "Revenir sur Habynex" : "Come back to Habynex",
              "https://Habynex.com",
              "#f43f5e, #e11d48"
            )}
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
            ${isFr 
              ? "Si vous ne souhaitez plus recevoir ces emails, " 
              : "If you no longer wish to receive these emails, "}
            <a href="https://Habynex.com/unsubscribe" style="color: #f43f5e;">
              ${isFr ? "désabonnez-vous ici" : "unsubscribe here"}
            </a>
          </p>
        </div>
      `, isFr ? "Nous avons de nouvelles propriétés pour vous !" : "We have new properties for you!")
    };
  }
};

// Helper function to get email template
export const getEmailTemplate = (type: EmailType, data: EmailTemplateData) => {
  const templateFn = emailTemplates[type];
  if (!templateFn) {
    throw new Error(`Unknown email template type: ${type}`);
  }
  return templateFn(data);
};
