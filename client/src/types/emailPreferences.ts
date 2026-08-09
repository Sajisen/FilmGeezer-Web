export interface EmailPreferencesValues {
  recommendationsAndDiscoveryEmailsEnabled: boolean;
  productUpdatesEmailsEnabled: boolean;
}

export interface EmailPreferences
  extends EmailPreferencesValues {
  revision: number;
  updatedAt: string | null;
}

export interface EmailPreferencesResponse {
  status: "success";
  code: "ACCOUNT_EMAIL_PREFERENCES_READY";
  preferences: EmailPreferences;
}

export interface EmailPreferencesUpdateResponse {
  status: "success";
  code: "ACCOUNT_EMAIL_PREFERENCES_UPDATED";
  message: string;
  changed: boolean;
  preferences: EmailPreferences;
}
