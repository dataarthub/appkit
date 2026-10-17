// Ambient declarations for optional dependencies and missing module types

declare module '@holiday-jp/holiday_jp' {
  export interface Holiday {
    date: string;
    week: string;
    name: string;
    name_en: string;
  }
  export function isHoliday(date: Date): boolean;
  export function between(start: Date, end: Date): Holiday[];
  export const holidays: Record<string, Holiday>;
}

declare module 'oci-common' {
  export class ConfigFileAuthenticationDetailsProvider {
    constructor(configurationFilePath?: string, profile?: string);
  }
  export const ResourcePrincipalAuthenticationDetailsProvider: {
    builder(): Promise<any>;
  };
}

