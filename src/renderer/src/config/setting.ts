import type { IPosterSize } from '@shared/config/setting';
import type { ITheme } from '@shared/config/theme';
import type { ILang } from '@shared/locales';

export interface IStoreSetting {
  theme: ITheme;
  lang: ILang;
  brandTheme: string;
  isSidebarCompact: boolean;
  timeout: number;
  debug: boolean;
  bossKey: string;
  zoom: number;
  posterLandscape: boolean;
  posterSize: IPosterSize;
  nav: {
    setting: string;
    lab: string;
  };
}

export const init: IStoreSetting = {
  theme: 'system',
  lang: 'system',
  brandTheme: '#85d46e',
  isSidebarCompact: false,
  timeout: 5000,
  debug: false,
  bossKey: '',
  zoom: 1,
  posterLandscape: false,
  posterSize: 'small',
  nav: {
    setting: 'baseConfig',
    lab: 'crypto',
  },
};

export default init;
