import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Music2, Youtube } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/assets/habinex-logo.jpeg";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  const footerLinks = {
    plateforme: [
      { key: "footer.howItWorks", href: "#" },
      { key: "common.search", href: "/search" },
      { key: "hero.cta2", href: "/create-listing" },
      { key: "footer.pricing", href: "#" },
    ],
    ressources: [
      { key: "footer.helpCenter", href: "#" },
      { key: "footer.blog", href: "#" },
      { key: "footer.tenantGuide", href: "#" },
      { key: "footer.ownerGuide", href: "#" },
    ],
    entreprise: [
      { key: "footer.about", href: "#" },
      { key: "footer.careers", href: "#" },
      { key: "footer.press", href: "#" },
      { key: "footer.contact", href: "/contact" },
    ],
    legal: [
      { key: "footer.termsOfUse", href: "#" },
      { key: "footer.privacyPolicy", href: "#" },
      { key: "footer.cookies", href: "#" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Music2, href: "#", label: "TikTok" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Habynex" className="w-10 h-10 rounded-xl object-contain" />
              <span className="text-xl font-bold">Habynex</span>
            </a>
            <p className="text-background/70 mb-6 max-w-xs">
              {t("footer.description")}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <a href="mailto:contact@habynex.cm" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                <Mail className="w-4 h-4" />
                contact@habynex.cm
              </a>
              <a href="tel:+237600000000" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                <Phone className="w-4 h-4" />
                +237 6 00 00 00 00
              </a>
              <div className="flex items-center gap-2 text-background/70">
                <MapPin className="w-4 h-4" />
                Yaoundé, Cameroun
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.platform")}</h4>
            <ul className="space-y-3">
              {footerLinks.plateforme.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="text-background/70 hover:text-background transition-colors">
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.resources")}</h4>
            <ul className="space-y-3">
              {footerLinks.ressources.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="text-background/70 hover:text-background transition-colors">
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.company")}</h4>
            <ul className="space-y-3">
              {footerLinks.entreprise.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="text-background/70 hover:text-background transition-colors">
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="text-background/70 hover:text-background transition-colors">
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-background/60 text-sm">
            © {currentYear} Habynex. {t("footer.copyright")}.
          </p>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
