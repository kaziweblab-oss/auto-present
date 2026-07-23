import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: { home: 'Home', loginHelp: 'How to login', downloads: 'Downloads' },
      app: { name: 'Auto Present', department: 'Department of Computer Science & Technology' },
      welcome: {
        eyebrow: 'Smart attendance, trusted records',
        title: 'Attendance that stays connected to your class.',
        description:
          'A secure, bilingual foundation for students, captains, and administrators—designed around Google Sheets as the source of truth.',
        roleTitle: 'Choose your path',
        roleEyebrow: 'Role-based access',
        futureAction: 'Authentication will be available in a future phase.',
      },
      roles: {
        STUDENT: 'Student',
        CAPTAIN: 'Captain',
        ADMIN: 'Administrator',
        STUDENT_DESCRIPTION: 'Review your identity and attendance when sign-in becomes available.',
        CAPTAIN_DESCRIPTION: 'Connect an authorized class Sheet and manage attendance.',
        ADMIN_DESCRIPTION: 'Manage access, registered Sheets, and system settings.',
      },
      status: {
        title: 'System status',
        checking: 'Checking API availability…',
        online: 'API is online',
        offline: 'API is unavailable',
      },
      theme: { label: 'Theme', system: 'System', light: 'Light', dark: 'Dark' },
      language: 'Language',
      menu: {
        label: 'Account and help',
        loginHelp: 'Get Login Help',
        captainPending: 'Captain: Sheet verification pending',
        studentPending: 'Student: Academic verification pending',
        adminAuthorized: 'Administrator access authorized',
        adminDenied: 'Administrator access denied',
        viewStatus: 'View verification status',
        logout: 'Logout',
        loggingOut: 'Logging out…',
        logoutFailed: 'Logout failed safely. Please try again.',
      },
      disconnect: {
        action: 'Disconnect Google',
        title: 'Disconnect Google?',
        identityAccess: "Auto Present's Google identity connection and consent will be removed.",
        workspaceAccess: 'Stored Google Workspace access, if present, will also be removed.',
        allSessions: 'All Auto Present sessions will be signed out.',
        permissionAgain: 'Future login and Sheet use will require Google authorization again.',
        googleAccountStaysSignedIn: 'You will remain signed in to your Google Account itself.',
        cancel: 'Cancel',
        confirm: 'Disconnect Google',
        disconnecting: 'Disconnecting…',
        identityUnavailable:
          'Google identity consent could not be removed here. Remove Auto Present from Google Account permissions, then retry.',
        partial:
          'Google identity consent was removed, but Auto Present cleanup is incomplete. Retry to finish signing out all sessions.',
        permissionsLink: 'Open Google Account permissions',
        identityConnected: 'Identity connected',
        workspaceConnected: 'Workspace connected',
        workspaceNotConnected: 'Workspace not connected',
        connectionChecking: 'Checking Google Workspace connection…',
      },
      help: {
        title: 'How to login',
        description: 'A guided sign-in video will appear here when authentication is released.',
        unavailable: 'The login help video is not available yet.',
      },
      downloads: {
        title: 'Downloads',
        description: 'Auto Present launches on the web first. Installable releases are planned.',
        unavailable: 'Not available in Phase 1',
      },
      common: {
        unavailable: 'Coming later',
        learnMore: 'Open page',
        loading: 'Loading page…',
      },
      auth: {
        signIn: 'Continue with Google',
        starting: 'Starting securely…',
        bootstrapDisabled: 'Sign-in is available after secure session checking finishes.',
        requestPending: 'Google sign-in is starting. Please wait.',
        finishing: 'Finishing secure sign-in…',
        failed: 'Sign-in could not be completed',
        welcome: 'Welcome, {{name}}',
        adminReady: 'Your administrator membership is active.',
        identityVerified: 'Identity verified',
        phase3Unavailable: 'Captain setup will become available in Phase 3.',
        recovery: {
          eyebrow: 'Sign-in recovery',
          reference: 'Reference: {{requestId}}',
          back: 'Back to role selection',
          tryAnother: 'Try another Google account',
          loginHelp: 'Open login help',
          retryFailed: 'Could not start a new Google sign-in. Please try again.',
        },
        pending: 'Your identity is verified. Role-specific academic verification is pending.',
        studentPending: 'Your identity is verified. Academic profile verification is pending.',
        captainPending: 'Your identity is verified. Captain Sheet verification is pending.',
        errors: {
          AUTH_START_FAILED: 'Could not start Google sign-in. Please try again.',
          access_denied: 'Google consent was declined.',
          OAUTH_TRANSACTION_INVALID: 'This sign-in request expired or was already used.',
          ADMIN_ACCESS_DENIED: 'This account has no active administrator membership.',
          SESSION_EXPIRED: 'Your session expired. Please sign in again.',
          REFRESH_TOKEN_REUSE: 'This session was revoked for security.',
          generic: 'Authentication failed safely. Please try again.',
        },
      },
      footer: {
        description:
          'A secure bilingual attendance experience built around Google Sheets as the source of truth.',
        quickLinks: 'Quick Links',
        support: 'Support & Help',
        legal: 'Legal',
        socialLinks: 'Configured social links',
        copyright: '© {{year}} Auto Present. All rights reserved.',
        maintainer: 'Developed and maintained by Kazi Tasin Hossen',
        links: {
          home: 'Home',
          chooseRole: 'Sign In / Choose Role',
          loginHelp: 'How to Login',
          downloads: 'Download Apps',
          systemStatus: 'System Status',
          helpCenter: 'Help Center',
          googlePermissions: 'Fix Google Permission',
          reportProblem: 'Report a Problem',
          tutorial: 'Watch Tutorial',
          privacy: 'Privacy Policy',
          terms: 'Terms of Service',
        },
      },
      information: {
        privacy: {
          eyebrow: 'Privacy',
          title: 'Privacy Policy',
          intro:
            'This policy explains the planned handling of personal information in Auto Present. It reflects the current architecture and must be reviewed before production verification.',
          sections: {
            dataCollected: {
              title: 'Data collected',
              body: 'Auto Present is designed to retain only the identity, role, roll, academic mapping, registered Sheet reference, active status, and verification timestamps needed to provide the service. It does not duplicate complete attendance history in MongoDB.',
            },
            googleIdentity: {
              title: 'Google account identity data',
              body: 'Sign-in will use basic Google identity information such as account ID, email, name, and profile image. Students will be asked only for openid, email, and profile scopes.',
            },
            roleAccess: {
              title: 'Role-specific Google Sheets and Drive access',
              body: 'Students will not grant Sheets or Drive access. Captains may later grant the minimum access required for a user-selected registered Spreadsheet. The backend will verify actual edit capability.',
            },
            dataUse: {
              title: 'How data is used',
              body: 'Identity and academic mapping will be used for authentication, authorization, locating the correct Sheet data, operational security, and user-requested attendance workflows.',
            },
            retention: {
              title: 'Minimum-data retention',
              body: 'Google Sheets remains the attendance source of truth. Any future change-detection state will be limited to references, fingerprints, totals, and timestamps needed to detect updates.',
            },
            tokenSecurity: {
              title: 'Token security',
              body: 'Application and Google tokens are kept separate. Secure HTTP-only cookies are planned for application refresh tokens, and Google refresh tokens must be encrypted at rest. Tokens and secrets must never be logged.',
            },
            sharing: {
              title: 'Data sharing',
              body: 'Auto Present does not currently include advertising or analytics integrations. Personal data is not intended to be sold. Required service providers and Google APIs will receive only information needed to operate authorized features.',
            },
            controls: {
              title: 'User controls',
              body: 'Users will be able to sign out, reconnect or revoke Google authorization, and request correction or removal of eligible application account and session data.',
            },
            removal: {
              title: 'Account and session removal',
              body: 'Removing an application account or session will not delete Sheets owned by the user or institute. Google access can also be revoked through the user’s Google Account permissions.',
            },
            contact: {
              title: 'Contact',
              body: 'A support contact is displayed through application configuration when an official support address is available. Until then, no unverified contact address is published.',
            },
          },
        },
        terms: {
          eyebrow: 'Legal',
          title: 'Terms of Service',
          intro:
            'These terms describe the intended use of Auto Present and require human legal review before production publication.',
          sections: {
            purpose: {
              title: 'Service purpose',
              body: 'Auto Present provides role-based tools for attendance workflows connected to authorized Google Sheets. It is not a replacement for institutional policy or final academic records.',
            },
            acceptableUse: {
              title: 'Acceptable use',
              body: 'Users must use the service only for authorized educational purposes and must not attempt unauthorized access, impersonation, disruption, or manipulation of attendance information.',
            },
            responsibilities: {
              title: 'Account responsibilities',
              body: 'Users are responsible for protecting their account, using the correct role and academic identity, reviewing submitted information, and reporting suspected unauthorized access.',
            },
            availability: {
              title: 'Availability',
              body: 'Service availability may be affected by maintenance, network conditions, Google services, database readiness, or institutional changes. No uninterrupted-availability guarantee is made.',
            },
            sheetOwnership: {
              title: 'Sheet ownership and permission',
              body: 'Users and institutions retain responsibility for their Spreadsheets and permissions. Captains must have verified edit capability for a registered Sheet before attendance actions are enabled.',
            },
            termination: {
              title: 'Suspension and termination',
              body: 'Access may be suspended or removed for security, permission loss, policy violations, role changes, or institutional requirements. Revoked Google authorization may require sign-in again.',
            },
            contact: {
              title: 'Contact',
              body: 'Questions about these terms can be submitted through the configured support channel when an official contact is available.',
            },
          },
        },
        support: {
          eyebrow: 'Support',
          title: 'Help Center',
          intro:
            'Use these public resources for login guidance, Google permission help, and configured support channels.',
          actions: 'Support actions',
          sections: {
            helpCenter: {
              title: 'Start with the guide',
              body: 'The How to Login page will provide the configured tutorial video when authentication guidance is available.',
            },
            loginHelp: {
              title: 'Login and role help',
              body: 'Authentication is not implemented in the current phase. Future sign-in will apply different Google permissions for students and captains.',
            },
            reporting: {
              title: 'Report a problem',
              body: 'A Report a Problem link appears only when a valid external support URL is configured. Do not include passwords, tokens, cookies, or authorization codes in a report.',
            },
            contact: {
              title: 'Contact support',
              body: 'An email action appears only when an official support email is configured. This prevents publishing a misleading or unmonitored address.',
            },
          },
        },
        googlePermissions: {
          eyebrow: 'Google access',
          title: 'Fix Google Permission',
          intro:
            'This guide explains the planned permission model. Google connection features are not active in the current phase.',
          sections: {
            why: {
              title: 'Why permissions may be requested',
              body: 'Auto Present will request Google permissions only when required for identity or an authorized captain workflow. The frontend will never call Google APIs directly.',
            },
            student: {
              title: 'Student permissions',
              body: 'Students will use only openid, email, and profile identity scopes. They will never be asked to grant Google Sheets or Drive access.',
            },
            captain: {
              title: 'Captain permissions',
              body: 'Captains may grant minimum Sheet and Drive authorization for a user-selected registered Spreadsheet. The backend will verify edit capability and the captain’s class roll.',
            },
            reconnect: {
              title: 'Reconnect an expired connection',
              body: 'If Google authorization is revoked or permanently invalid, the application will require a fresh login or reconnection instead of repeatedly using an invalid token.',
            },
            removeAccess: {
              title: 'Remove access',
              body: 'Users can revoke application access from their Google Account security settings. Revocation may end the related Auto Present session and disable Google-dependent features.',
            },
          },
        },
      },
    },
  },
  bn: {
    translation: {
      nav: { home: 'হোম', loginHelp: 'লগইন নির্দেশনা', downloads: 'ডাউনলোড' },
      app: { name: 'অটো প্রেজেন্ট', department: 'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি বিভাগ' },
      welcome: {
        eyebrow: 'স্মার্ট উপস্থিতি, নির্ভরযোগ্য রেকর্ড',
        title: 'আপনার ক্লাসের সঙ্গে সংযুক্ত উপস্থিতি ব্যবস্থাপনা।',
        description:
          'শিক্ষার্থী, ক্যাপ্টেন ও প্রশাসকের জন্য নিরাপদ দ্বিভাষিক ভিত্তি—যেখানে Google Sheets তথ্যের মূল উৎস।',
        roleTitle: 'আপনার ভূমিকা বেছে নিন',
        roleEyebrow: 'ভূমিকা-ভিত্তিক প্রবেশাধিকার',
        futureAction: 'পরবর্তী ধাপে authentication চালু হবে।',
      },
      roles: {
        STUDENT: 'শিক্ষার্থী',
        CAPTAIN: 'ক্যাপ্টেন',
        ADMIN: 'প্রশাসক',
        STUDENT_DESCRIPTION: 'সাইন-ইন চালু হলে পরিচয় ও উপস্থিতি দেখুন।',
        CAPTAIN_DESCRIPTION: 'অনুমোদিত class Sheet সংযুক্ত করে উপস্থিতি পরিচালনা করুন।',
        ADMIN_DESCRIPTION: 'অ্যাক্সেস, নিবন্ধিত Sheets ও system settings পরিচালনা করুন।',
      },
      status: {
        title: 'সিস্টেম অবস্থা',
        checking: 'API সংযোগ যাচাই হচ্ছে…',
        online: 'API সচল আছে',
        offline: 'API পাওয়া যাচ্ছে না',
      },
      theme: { label: 'থিম', system: 'সিস্টেম', light: 'লাইট', dark: 'ডার্ক' },
      language: 'ভাষা',
      menu: {
        label: 'অ্যাকাউন্ট ও সহায়তা',
        loginHelp: 'লগইন সহায়তা নিন',
        captainPending: 'ক্যাপ্টেন: Sheet যাচাই অপেক্ষমাণ',
        studentPending: 'শিক্ষার্থী: একাডেমিক যাচাই অপেক্ষমাণ',
        adminAuthorized: 'প্রশাসক অ্যাক্সেস অনুমোদিত',
        adminDenied: 'প্রশাসক অ্যাক্সেস অননুমোদিত',
        viewStatus: 'যাচাইয়ের অবস্থা দেখুন',
        logout: 'লগআউট',
        loggingOut: 'লগআউট হচ্ছে…',
        logoutFailed: 'নিরাপদভাবে লগআউট করা যায়নি। আবার চেষ্টা করুন।',
      },
      disconnect: {
        action: 'Google সংযোগ বিচ্ছিন্ন করুন',
        title: 'Google সংযোগ বিচ্ছিন্ন করবেন?',
        identityAccess: 'Auto Present-এর Google পরিচয় সংযোগ ও সম্মতি সরানো হবে।',
        workspaceAccess: 'সংরক্ষিত Google Workspace access থাকলে সেটিও সরানো হবে।',
        allSessions: 'সব Auto Present session থেকে sign out হবে।',
        permissionAgain: 'ভবিষ্যতে login ও Sheet ব্যবহারে আবার Google অনুমোদন দিতে হবে।',
        googleAccountStaysSignedIn: 'আপনি নিজের Google Account-এ sign in অবস্থায় থাকবেন।',
        cancel: 'বাতিল',
        confirm: 'Google সংযোগ বিচ্ছিন্ন করুন',
        disconnecting: 'সংযোগ বিচ্ছিন্ন হচ্ছে…',
        identityUnavailable:
          'এখান থেকে Google পরিচয় সম্মতি সরানো যায়নি। Google Account permissions থেকে Auto Present সরিয়ে আবার চেষ্টা করুন।',
        partial:
          'Google পরিচয় সম্মতি সরানো হয়েছে, কিন্তু Auto Present cleanup অসম্পূর্ণ। সব session শেষ করতে আবার চেষ্টা করুন।',
        permissionsLink: 'Google Account permissions খুলুন',
        identityConnected: 'পরিচয় সংযুক্ত',
        workspaceConnected: 'Workspace সংযুক্ত',
        workspaceNotConnected: 'Workspace সংযুক্ত নয়',
        connectionChecking: 'Google Workspace সংযোগ যাচাই হচ্ছে…',
      },
      help: {
        title: 'কীভাবে লগইন করবেন',
        description: 'Authentication প্রকাশিত হলে এখানে ধাপে ধাপে sign-in video থাকবে।',
        unavailable: 'লগইন সহায়তা ভিডিওটি এখনো পাওয়া যাচ্ছে না।',
      },
      downloads: {
        title: 'ডাউনলোড',
        description: 'Auto Present প্রথমে web-এ আসবে। Installable release পরিকল্পনায় আছে।',
        unavailable: 'Phase 1-এ পাওয়া যাচ্ছে না',
      },
      common: {
        unavailable: 'পরে আসছে',
        learnMore: 'পৃষ্ঠা খুলুন',
        loading: 'পৃষ্ঠা লোড হচ্ছে…',
      },
      auth: {
        signIn: 'Google দিয়ে চালিয়ে যান',
        starting: 'নিরাপদভাবে শুরু হচ্ছে…',
        bootstrapDisabled: 'নিরাপদ সেশন যাচাই শেষ হলে সাইন-ইন ব্যবহার করা যাবে।',
        requestPending: 'Google সাইন-ইন শুরু হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।',
        finishing: 'নিরাপদ সাইন-ইন সম্পন্ন হচ্ছে…',
        failed: 'সাইন-ইন সম্পন্ন করা যায়নি',
        welcome: 'স্বাগতম, {{name}}',
        adminReady: 'আপনার অ্যাডমিন সদস্যপদ সক্রিয়।',
        identityVerified: 'পরিচয় যাচাই সম্পন্ন',
        phase3Unavailable: 'ক্যাপ্টেন সেটআপ Phase 3-তে চালু হবে।',
        recovery: {
          eyebrow: 'সাইন-ইন পুনরুদ্ধার',
          reference: 'রেফারেন্স: {{requestId}}',
          back: 'ভূমিকা নির্বাচনে ফিরে যান',
          tryAnother: 'অন্য Google অ্যাকাউন্ট দিয়ে চেষ্টা করুন',
          loginHelp: 'লগইন সহায়তা খুলুন',
          retryFailed: 'নতুন Google সাইন-ইন শুরু করা যায়নি। আবার চেষ্টা করুন।',
        },
        pending: 'আপনার পরিচয় যাচাই হয়েছে। ভূমিকা-নির্দিষ্ট একাডেমিক যাচাই অপেক্ষমাণ।',
        studentPending: 'আপনার পরিচয় যাচাই হয়েছে। একাডেমিক প্রোফাইল যাচাই অপেক্ষমাণ।',
        captainPending: 'আপনার পরিচয় যাচাই হয়েছে। ক্যাপ্টেন Sheet যাচাই অপেক্ষমাণ।',
        errors: {
          AUTH_START_FAILED: 'Google সাইন-ইন শুরু করা যায়নি। আবার চেষ্টা করুন।',
          access_denied: 'Google অনুমতি দেওয়া হয়নি।',
          OAUTH_TRANSACTION_INVALID: 'সাইন-ইন অনুরোধটির মেয়াদ শেষ অথবা এটি আগে ব্যবহৃত হয়েছে।',
          ADMIN_ACCESS_DENIED: 'এই অ্যাকাউন্টের সক্রিয় অ্যাডমিন সদস্যপদ নেই।',
          SESSION_EXPIRED: 'আপনার সেশনের মেয়াদ শেষ। আবার সাইন-ইন করুন।',
          REFRESH_TOKEN_REUSE: 'নিরাপত্তার জন্য এই সেশন বাতিল করা হয়েছে।',
          generic: 'নিরাপদভাবে authentication ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
        },
      },
      footer: {
        description:
          'Google Sheets-কে তথ্যের মূল উৎস রেখে তৈরি একটি নিরাপদ দ্বিভাষিক উপস্থিতি অভিজ্ঞতা।',
        quickLinks: 'দ্রুত লিংক',
        support: 'সহায়তা',
        legal: 'আইনি তথ্য',
        socialLinks: 'কনফিগার করা সামাজিক লিংক',
        copyright: '© {{year}} Auto Present। সর্বস্বত্ব সংরক্ষিত।',
        maintainer: 'তৈরি ও রক্ষণাবেক্ষণে কাজী তাসিন হোসেন',
        links: {
          home: 'হোম',
          chooseRole: 'সাইন ইন / ভূমিকা নির্বাচন',
          loginHelp: 'কীভাবে লগইন করবেন',
          downloads: 'অ্যাপ ডাউনলোড',
          systemStatus: 'সিস্টেম অবস্থা',
          helpCenter: 'সহায়তা কেন্দ্র',
          googlePermissions: 'Google অনুমতি ঠিক করুন',
          reportProblem: 'সমস্যা জানান',
          tutorial: 'টিউটোরিয়াল দেখুন',
          privacy: 'গোপনীয়তা নীতি',
          terms: 'ব্যবহারের শর্তাবলি',
        },
      },
      information: {
        privacy: {
          eyebrow: 'গোপনীয়তা',
          title: 'গোপনীয়তা নীতি',
          intro:
            'Auto Present ব্যক্তিগত তথ্য কীভাবে পরিচালনার পরিকল্পনা করেছে তা এখানে ব্যাখ্যা করা হয়েছে। এটি বর্তমান architecture অনুসরণ করে এবং production verification-এর আগে review প্রয়োজন।',
          sections: {
            dataCollected: {
              title: 'সংগৃহীত তথ্য',
              body: 'সেবা দেওয়ার জন্য প্রয়োজনীয় পরিচয়, ভূমিকা, রোল, academic mapping, registered Sheet reference, active status ও verification timestamp-এর মতো ন্যূনতম তথ্য রাখার জন্য Auto Present তৈরি। সম্পূর্ণ attendance history MongoDB-তে নকল করা হয় না।',
            },
            googleIdentity: {
              title: 'Google account পরিচয় তথ্য',
              body: 'Sign-in-এ account ID, email, name ও profile image-এর মতো basic Google identity ব্যবহার হবে। শিক্ষার্থীর জন্য শুধু openid, email ও profile scope চাওয়া হবে।',
            },
            roleAccess: {
              title: 'ভূমিকাভিত্তিক Google Sheets ও Drive access',
              body: 'শিক্ষার্থী Sheets বা Drive access দেবে না। ক্যাপ্টেন পরবর্তীতে নিজের নির্বাচিত registered Spreadsheet-এর জন্য প্রয়োজনীয় সর্বনিম্ন access দিতে পারবে। Backend প্রকৃত edit capability যাচাই করবে।',
            },
            dataUse: {
              title: 'তথ্যের ব্যবহার',
              body: 'পরিচয় ও academic mapping authentication, authorization, সঠিক Sheet data খোঁজা, operational security এবং ব্যবহারকারীর অনুরোধ করা attendance workflow-এ ব্যবহৃত হবে।',
            },
            retention: {
              title: 'ন্যূনতম তথ্য সংরক্ষণ',
              body: 'Google Sheets attendance-এর মূল উৎস থাকবে। ভবিষ্যৎ change detection state শুধু প্রয়োজনীয় reference, fingerprint, total ও timestamp-এ সীমিত থাকবে।',
            },
            tokenSecurity: {
              title: 'Token নিরাপত্তা',
              body: 'Application ও Google token আলাদা রাখা হবে। Application refresh token-এর জন্য secure HTTP-only cookie পরিকল্পিত এবং Google refresh token encrypted at rest হতে হবে। Token বা secret log করা যাবে না।',
            },
            sharing: {
              title: 'তথ্য শেয়ার',
              body: 'Auto Present-এ বর্তমানে advertising বা analytics integration নেই। ব্যক্তিগত তথ্য বিক্রির উদ্দেশ্য নেই। অনুমোদিত feature চালাতে যতটুকু প্রয়োজন, service provider ও Google API শুধু ততটুকু তথ্য পাবে।',
            },
            controls: {
              title: 'ব্যবহারকারীর নিয়ন্ত্রণ',
              body: 'ব্যবহারকারী sign out, Google authorization reconnect বা revoke এবং প্রযোজ্য application account ও session data সংশোধন বা অপসারণের অনুরোধ করতে পারবে।',
            },
            removal: {
              title: 'Account ও session অপসারণ',
              body: 'Application account বা session সরালে ব্যবহারকারী বা প্রতিষ্ঠানের মালিকানাধীন Sheet মুছে যাবে না। Google Account permissions থেকেও Google access revoke করা যাবে।',
            },
            contact: {
              title: 'যোগাযোগ',
              body: 'Official support address পাওয়া গেলে application configuration-এর মাধ্যমে support contact দেখানো হবে। তার আগে কোনো যাচাইহীন contact address প্রকাশ করা হবে না।',
            },
          },
        },
        terms: {
          eyebrow: 'আইনি তথ্য',
          title: 'ব্যবহারের শর্তাবলি',
          intro:
            'এই শর্তগুলো Auto Present-এর পরিকল্পিত ব্যবহার ব্যাখ্যা করে এবং production publication-এর আগে human legal review প্রয়োজন।',
          sections: {
            purpose: {
              title: 'সেবার উদ্দেশ্য',
              body: 'Auto Present অনুমোদিত Google Sheets-এর সঙ্গে সংযুক্ত role-based attendance workflow দেয়। এটি প্রাতিষ্ঠানিক নীতি বা চূড়ান্ত academic record-এর বিকল্প নয়।',
            },
            acceptableUse: {
              title: 'গ্রহণযোগ্য ব্যবহার',
              body: 'সেবা শুধু অনুমোদিত শিক্ষামূলক কাজে ব্যবহার করতে হবে। অননুমোদিত access, impersonation, disruption বা attendance information manipulation করা যাবে না।',
            },
            responsibilities: {
              title: 'Account-এর দায়িত্ব',
              body: 'নিজের account সুরক্ষিত রাখা, সঠিক role ও academic identity ব্যবহার, submitted information review এবং সন্দেহজনক access report করা ব্যবহারকারীর দায়িত্ব।',
            },
            availability: {
              title: 'সেবার প্রাপ্যতা',
              body: 'Maintenance, network, Google service, database readiness বা প্রাতিষ্ঠানিক পরিবর্তনের কারণে সেবা প্রভাবিত হতে পারে। নিরবচ্ছিন্ন availability-এর নিশ্চয়তা দেওয়া হয় না।',
            },
            sheetOwnership: {
              title: 'Sheet ownership ও permission',
              body: 'নিজেদের Spreadsheet ও permissions-এর দায়িত্ব ব্যবহারকারী ও প্রতিষ্ঠানের। Attendance action চালুর আগে captain-এর registered Sheet edit capability যাচাই হতে হবে।',
            },
            termination: {
              title: 'স্থগিতকরণ ও সমাপ্তি',
              body: 'Security, permission loss, policy violation, role change বা institutional requirement-এর কারণে access স্থগিত বা বাতিল হতে পারে। Google authorization revoke হলে আবার sign-in প্রয়োজন হতে পারে।',
            },
            contact: {
              title: 'যোগাযোগ',
              body: 'Official contact কনফিগার হলে এই শর্ত সম্পর্কে প্রশ্ন configured support channel-এ পাঠানো যাবে।',
            },
          },
        },
        support: {
          eyebrow: 'সহায়তা',
          title: 'সহায়তা কেন্দ্র',
          intro:
            'Login guidance, Google permission help ও configured support channel-এর জন্য এই public resources ব্যবহার করুন।',
          actions: 'সহায়তার কাজ',
          sections: {
            helpCenter: {
              title: 'Guide দিয়ে শুরু করুন',
              body: 'Authentication guidance পাওয়া গেলে How to Login page configured tutorial video দেখাবে।',
            },
            loginHelp: {
              title: 'Login ও role সহায়তা',
              body: 'বর্তমান phase-এ authentication implement করা হয়নি। ভবিষ্যৎ sign-in-এ student ও captain-এর জন্য আলাদা Google permission প্রযোজ্য হবে।',
            },
            reporting: {
              title: 'সমস্যা জানান',
              body: 'Valid external support URL কনফিগার থাকলেই Report a Problem link দেখা যাবে। Report-এ password, token, cookie বা authorization code দেবেন না।',
            },
            contact: {
              title: 'Support-এ যোগাযোগ',
              body: 'Official support email কনফিগার থাকলেই email action দেখা যাবে। এতে misleading বা unmonitored address প্রকাশ হয় না।',
            },
          },
        },
        googlePermissions: {
          eyebrow: 'Google access',
          title: 'Google অনুমতি ঠিক করুন',
          intro:
            'এটি পরিকল্পিত permission model ব্যাখ্যা করে। বর্তমান phase-এ Google connection feature active নয়।',
          sections: {
            why: {
              title: 'কেন permission প্রয়োজন হতে পারে',
              body: 'পরিচয় বা অনুমোদিত captain workflow-এর জন্য প্রয়োজন হলেই Auto Present Google permission চাইবে। Frontend কখনো সরাসরি Google API call করবে না।',
            },
            student: {
              title: 'Student permission',
              body: 'Student শুধু openid, email ও profile identity scope ব্যবহার করবে। Google Sheets বা Drive access কখনো চাওয়া হবে না।',
            },
            captain: {
              title: 'Captain permission',
              body: 'Captain user-selected registered Spreadsheet-এর জন্য ন্যূনতম Sheet ও Drive authorization দিতে পারবে। Backend edit capability ও captain-এর class roll যাচাই করবে।',
            },
            reconnect: {
              title: 'Expired connection আবার যুক্ত করুন',
              body: 'Google authorization revoke বা স্থায়ীভাবে invalid হলে invalid token বারবার ব্যবহার না করে application নতুন login বা reconnection চাইবে।',
            },
            removeAccess: {
              title: 'Access সরান',
              body: 'Google Account security settings থেকে application access revoke করা যাবে। এতে সংশ্লিষ্ট Auto Present session শেষ এবং Google-dependent feature বন্ধ হতে পারে।',
            },
          },
        },
      },
    },
  },
} as const;

const initialLanguage = localStorage.getItem('auto-present-language') === 'bn' ? 'bn' : 'en';
document.documentElement.lang = initialLanguage;

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language.startsWith('bn') ? 'bn' : 'en';
});

void i18n.use(initReactI18next).init({
  showSupportNotice: false,
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: ['en', 'bn'],
  interpolation: { escapeValue: false },
});

export default i18n;
