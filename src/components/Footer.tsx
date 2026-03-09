import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Music2, Youtube } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/assets/Habynex-logo.jpeg";

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
    { icon: Facebook, href: "https://www.facebook.com/share/1C7F5LKYxy/", label: "Facebook" },
//    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "https://www.instagram.com/habynex", label: "Instagram" },
  //  { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Music2, href: "https://www.tiktok.com/@habynex?_r=1&_d=ei5h107g9e1f7i&sec_uid=MS4wLjABAAAA3L0zPxi4OfCmnZF_nAt_otSuKIkWhgPih3sug-_YDMd1zESfd5rfCwGTgk63k5Ob&share_author_id=7420020090450986017&sharer_language=fr&source=h5_m&u_code=egdbj7ck8f9117&timestamp=1773051722&user_id=7420020090450986017&sec_user_id=MS4wLjABAAAA3L0zPxi4OfCmnZF_nAt_otSuKIkWhgPih3sug-_YDMd1zESfd5rfCwGTgk63k5Ob&item_author_type=1&utm_source=copy&utm_campaign=client_share&utm_medium=android&share_iid=7607365336032560918&share_link_id=a5038811-0887-4285-9403-266a87f37719&share_app_id=1233&ugbiz_name=ACCOUNT&ug_btm=b8727%2Cb4907&social_share_type=5&enable_checksum=1 ", label: "TikTok" },
    //{ icon: Youtube, href: "#", label: "YouTube" },
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
              <a href="mailto:contact.habynex@gmail.com" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                <Mail className="w-4 h-4" />
                contact.habynex@gmail.com
              </a>
              <a href="tel:+237654888084" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors">
                <Phone className="w-4 h-4" />
                +237 6 54 88 80 84
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
