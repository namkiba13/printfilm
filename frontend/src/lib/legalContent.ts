/** 法律与联系页文案：用户协议、隐私政策、联系渠道 */

export type LegalSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export type LegalDoc = {
  slug: 'terms' | 'privacy'
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
}

export const LEGAL_DOCS: Record<'terms' | 'privacy', LegalDoc> = {
  terms: {
    slug: 'terms',
    title: "Terms of Service",
    updatedAt: '2026-08-17',
    intro:
      "Welcome to PRINTFILM (hereinafter referred to as the \"Platform\"). Before registering for or using the Platform's services, please read this agreement carefully. Once you begin using the Platform, you are deemed to have read and agreed to the following terms.",
    sections: [
      {
        title: "1. Service Description",
        paragraphs: [
          "PRINTFILM provides services related to AI Drama, AI Short Video, and creative tools, including text-to-image, image-to-image, and text-to-video. Service content may change as the product evolves. We will make every effort to announce significant changes on the relevant page or through announcements.",
          "The platform charges based on actual usage of upstream models. Recharged balances remain valid indefinitely, with no mandatory subscription. Specific prices and bonus rules are subject to those displayed on the pricing page and at checkout.",
        ],
      },
      {
        title: "2. Account and Security",
        bullets: [
          "You must register using accurate and valid information and are responsible for all activity under your account.",
          "Please keep your login credentials secure. You are responsible for any losses caused by account disclosure or sharing.",
          "If you discover unauthorized use, please notify us promptly through \"Contact Us.\"",
          "We reserve the right to restrict, reserve, or deactivate relevant accounts upon discovering violations, fraud, or abuse.",
        ],
      },
      {
        title: "3. Content and Intellectual Property",
        paragraphs: [
          "Prompts, scripts, materials, and other content you provide remain the property of you or the original rights holder. You warrant that you have lawful rights to uploaded content and must not infringe third-party intellectual property, portrait, privacy, or other rights.",
          "AI-generated content may be inaccurate, incomplete, or inconsistent with your expectations. Please review it yourself before publishing. You are solely responsible for disputes arising from your public or commercial use of generated content.",
          "The intellectual property rights in the platform's interface, trademarks, software, documentation, and other materials belong to PRINTFILM or the relevant rights holders. Without permission, you may not copy, reverse engineer, or use them for commercial purposes unrelated to this service.",
        ],
      },
      {
        title: "4. Billing and Top-Ups",
        bullets: [
          "Generation tasks are charged at TokenFree's official cost, consistent with upstream pricing and without markup. An estimated amount may be reserved when a task starts; after completion, billing is based on actual usage, with overpayments refunded and shortfalls collected.",
          "Top-ups are completed through Alipay, WeChat Pay, and other channels. The system records determine when funds are credited.",
          "Unless otherwise required by law or expressly specified by the platform, credited top-up balances are generally non-refundable.",
          "If a system error causes duplicate charges or funds not to be credited, please retain the order number and contact customer service for verification and resolution.",
        ],
      },
      {
        title: "5. Prohibited Conduct",
        bullets: [
          "Using the service to create or distribute illegal, pornographic, violent, hateful, fraudulent, or rights-infringing content.",
          "Attacking or scraping the platform, bypassing billing, abusing interfaces, or disrupting other users.",
          "Reselling accounts without authorization, registering accounts in bulk, or engaging in other conduct that undermines fair platform operations.",
        ],
      },
      {
        title: "6. Disclaimers and Limitation of Liability",
        paragraphs: [
          "To the extent permitted by law, the platform is not liable for service interruptions or data loss caused by network failures, third-party service interruptions, or force majeure.",
          "AI output is provided solely as a creative aid and does not constitute professional advice. The platform is not liable for direct or indirect losses arising from reliance on generated content beyond the service fees you have paid, except where otherwise mandatorily required by law.",
        ],
      },
      {
        title: "7. Agreement Changes and Termination",
        paragraphs: [
          "We may revise this agreement from time to time. Revised versions will be published on this page, with the \"Updated\" date controlling. Your continued use of the service constitutes acceptance of the revised agreement.",
          "You may stop using the service and request account closure at any time. We may also terminate service to you if you seriously violate this agreement.",
        ],
      },
      {
        title: "8. Contact Information",
        paragraphs: [
          "If you have questions about this agreement, please submit feedback on the \"Contact Us\" page or email support@printfilm.com.",
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: "Privacy Policy",
    updatedAt: '2026-08-17',
    intro:
      "PRINTFILM values your privacy. This policy explains how we collect, use, store, and protect your personal information. By using the platform, you acknowledge the practices described in this policy.",
    sections: [
      {
        title: "1. Information We Collect",
        bullets: [
          "Account information: registration email address, nickname, avatar, and data related to login and authentication.",
          "Usage data: creative projects, prompts, generation task statuses, tool activity logs, asset library content, and other business data.",
          "Billing information: balance, reserved amount, top-up orders, usage, and charge details. Payments are processed by third-party channels; we do not store complete bank card numbers or other sensitive payment information.",
          "Technical logs: necessary logs such as IP address, browser type, and access time, used for security and troubleshooting.",
        ],
      },
      {
        title: "2. Purposes of Information Use",
        bullets: [
          "Providing, maintaining, and improving creative services such as AI Drama, AI Short Video, and tools.",
          "Identity verification, billing and settlement, order inquiries, and customer support.",
          "Protecting account and system security and preventing fraud and abuse.",
          "Sending service notifications or product updates with your consent or as permitted by law.",
        ],
      },
      {
        title: "3. Storage and Third Parties",
        paragraphs: [
          "Your media and creative files may be stored in cloud object storage, such as Alibaba Cloud OSS, for preview and download.",
          "Payments are processed by partners such as YiPay, while large-model inference is performed by upstream model service providers. We provide them only with the data necessary to deliver the service and require them to protect the information as agreed.",
          "Except as required by law, with your explicit consent, or as necessary to protect the lawful rights and interests of the platform and its users, we will not sell your personal information to unrelated third parties.",
        ],
      },
      {
        title: "4. Cookies and Local Storage",
        paragraphs: [
          "To maintain your sign-in status and preferences, we may use cookies or browser local storage (such as token). You can clear them in your browser, but this may require you to sign in again.",
        ],
      },
      {
        title: "5. Your Rights",
        bullets: [
          "Review and correct your account information (available in your account center).",
          "Export or download creative works you are authorized to access (within the scope permitted by product features).",
          "Request account deletion; after deletion, we will delete or anonymize the relevant personal information as required by applicable laws and regulations, except where retention is legally required.",
          "Submit inquiries or complaints regarding privacy-related matters.",
        ],
      },
      {
        title: "6. Protection of Minors",
        paragraphs: [
          "This platform is primarily intended for users with full civil capacity. If you are a minor, please read this policy and use the services under the guidance of your guardian.",
        ],
      },
      {
        title: "7. Policy Updates",
        paragraphs: [
          "We may update this policy and publish the latest version and update date on this page. For significant changes, we will make reasonable efforts to notify you through in-app notices and other means.",
        ],
      },
      {
        title: "8. Contact Us",
        paragraphs: [
          "If you have any questions about this policy, please visit \"Contact Us\" or email support@printfilm.com.",
        ],
      },
    ],
  },
}

export const LEGAL_DOCS_EN: Record<'terms' | 'privacy', LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    updatedAt: '2026-08-17',
    intro:
      'Welcome to PRINTFILM (“the Platform”). Please read these terms before you register or use the service. Using the Platform means you have read and agree to them.',
    sections: [
      {
        title: '1. The service',
        paragraphs: [
          'PRINTFILM provides AI drama, explainer video, and creation tools (including text-to-image, image-to-image, and text-to-video). Features may change as the product evolves; we will try to note material changes on the site or in notices.',
          'Billing follows actual upstream model usage. Topped-up balance does not expire and there is no forced subscription. Prices and bonuses follow the Pricing page and the checkout screen.',
        ],
      },
      {
        title: '2. Accounts and security',
        bullets: [
          'Register with accurate information and you are responsible for activity under the account.',
          'Keep credentials safe. Losses from leaks or sharing are yours to bear.',
          'If you see unauthorized use, tell us via Contact.',
          'We may limit, freeze, or close accounts for abuse, fraud, or policy violations.',
        ],
      },
      {
        title: '3. Content and IP',
        paragraphs: [
          'Prompts, scripts, and uploads remain yours or the original rights holder’s. You warrant you have the right to upload them and will not infringe IP, portrait, or privacy rights.',
          'AI output may be inaccurate or unexpected. Review it before publishing. Disputes from your public or commercial use are your responsibility.',
          'The Platform UI, marks, software, and docs belong to PRINTFILM or licensors. Do not copy, reverse-engineer, or use them outside this service without permission.',
        ],
      },
      {
        title: '4. Billing and top-ups',
        bullets: [
          'Generation jobs are billed by upstream tokens or agreed unit prices. We may pre-authorize an estimate and settle the real usage afterward.',
          'Top-ups go through Alipay, WeChat Pay, and similar channels. Arrival follows system records.',
          'Except where law requires otherwise or we explicitly agree, arrived credits are generally non-refundable.',
          'If a fault causes a double charge or missing credit, keep the order ID and contact support.',
        ],
      },
      {
        title: '5. Prohibited use',
        bullets: [
          'Do not create or spread illegal, pornographic, violent, hateful, fraudulent, or otherwise infringing content.',
          'Do not attack, scrape, bypass billing, abuse APIs, or disrupt other users.',
          'Do not resell accounts, bulk-register, or otherwise harm fair operation.',
        ],
      },
      {
        title: '6. Disclaimers',
        paragraphs: [
          'To the extent allowed by law, we are not liable for outages or data loss from network faults, third-party interruptions, or force majeure.',
          'AI output is a creation aid, not professional advice. We are not liable beyond fees you paid for losses from relying on generated content, except where law requires otherwise.',
        ],
      },
      {
        title: '7. Changes and termination',
        paragraphs: [
          'We may revise these terms and post the new version here with an updated date. Continued use means you accept the revision.',
          'You may stop using the service and request account deletion. We may also stop serving you if you seriously breach these terms.',
        ],
      },
      {
        title: '8. Contact',
        paragraphs: [
          'Questions about these terms: use Contact or email support@printfilm.com.',
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    updatedAt: '2026-08-17',
    intro:
      'PRINTFILM respects your privacy. This policy explains how we collect, use, store, and protect personal information. Using the Platform means you understand this processing.',
    sections: [
      {
        title: '1. Information we collect',
        bullets: [
          'Account data: email, display name, avatar, and authentication data.',
          'Usage data: projects, prompts, job status, tool runs, and asset library content.',
          'Billing data: balance, holds, top-up orders, and usage ledgers (payment is handled by third parties; we do not store full card numbers).',
          'Technical logs: IP, browser type, and access time for security and debugging.',
        ],
      },
      {
        title: '2. How we use it',
        bullets: [
          'Provide, maintain, and improve drama, explainer, and tool services.',
          'Identity checks, billing, order queries, and support.',
          'Account and system security, fraud and abuse prevention.',
          'Service notices or product updates where you consent or law allows.',
        ],
      },
      {
        title: '3. Storage and third parties',
        paragraphs: [
          'Media and project files may live in cloud object storage (such as Alibaba Cloud OSS) for preview and download.',
          'Payments go through partners such as Epay; model inference goes through upstream providers. We share only what is needed to complete the service.',
          'We do not sell personal information to unrelated third parties except as required by law, with your consent, or to protect the Platform and users.',
        ],
      },
      {
        title: '4. Cookies and local storage',
        paragraphs: [
          'We may use cookies or local storage (such as a token) to keep you signed in and remember preferences. Clearing them may require signing in again.',
        ],
      },
      {
        title: '5. Your rights',
        bullets: [
          'View and correct profile data in Account.',
          'Export or download creative output where the product allows.',
          'Request account deletion; we will delete or anonymize personal data as required, except records the law keeps.',
          'Ask questions or complain about privacy.',
        ],
      },
      {
        title: '6. Children',
        paragraphs: [
          'The Platform is intended for users with full civil capacity. If you are a minor, read this policy and use the service with a guardian.',
        ],
      },
      {
        title: '7. Policy updates',
        paragraphs: [
          'We may update this policy and post the latest version and date here. For material changes we will try to notify you in-product.',
        ],
      },
      {
        title: '8. Contact',
        paragraphs: [
          'Questions: use Contact or email support@printfilm.com.',
        ],
      },
    ],
  },
}

// 按界面语言取用户协议 / 隐私政策
export function getLegalDoc(slug: 'terms' | 'privacy', locale: string): LegalDoc {
  const pack = locale === 'en' ? LEGAL_DOCS_EN : LEGAL_DOCS
  return pack[slug]
}

export type ContactChannel = {
  title: string
  desc: string
  href?: string
  actionLabel?: string
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    title: "Email Support",
    desc: "We generally respond within 1–2 business days; please include your account email address and order number, if available.",
    href: 'mailto:support@printfilm.com',
    actionLabel: 'support@printfilm.com',
  },
  {
    title: "Help Center",
    desc: "For common questions about top-ups, downloads, AI Drama, and tools, you can search the Help Center first.",
    href: '/help',
    actionLabel: "Go to Help Center",
  },
  {
    title: "Business Partnerships / Corporate Bank Transfers",
    desc: "For bulk corporate top-ups, API partnerships, or invoice requests, please email us with your company name and requirements, and we will arrange a follow-up.",
    href: "mailto:support@printfilm.com?subject=PRINTFILM%20%E4%BC%81%E4%B8%9A%E5%90%88%E4%BD%9C",
    actionLabel: "Send Partnership Email",
  },
]

export const CONTACT_TOPICS = [
  "Account and Login",
  "Top-Ups and Credit Delivery",
  "Creation Task Issues",
  "Downloads and Assets",
  "Privacy and Account Deletion",
  "Other",
] as const
