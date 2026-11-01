export enum SNIFFER_TYPE {
  CDP = 'cdp',
  CUSTOM = 'custom',
}
export type ISnifferType = `${SNIFFER_TYPE}`;

export enum POSTER_SIZE {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}
export type IPosterSize = `${POSTER_SIZE}`;

export enum REC_HOT_TYPE {
  BAIDU = 'baidu',
  DOUBAN = 'douban',
  ENLIGHTENT = 'enlightent',
  HISENSE = 'hisense',
  HUANTV = 'huantv',
  KOMECT = 'komect',
  KYLIVE = 'kylive',
  QUARK = 'quark',
}
export type IRecHotType = `${REC_HOT_TYPE}`;

export enum REC_ASSOCIATION_TYPE {
  DOUBAN = 'douban',
  HISENSE = 'hisense',
  // KOMECT = 'komect',
  IQIYI = 'iqiyi',
  SNM = 'snm',
}
export type IRecAssociationType = `${REC_ASSOCIATION_TYPE}`;

export enum PLAYER_TYPE {
  XGPLAYER = 'xgplayer',
  // DPLAYER = 'dplayer',
  ARTPLAYER = 'artplayer',
  // NPLAYER = 'nplayer',
  // OPLAYER = 'oplayer',
  // ALIPLAYER = 'aliplayer',
  // VEPLAYER = 'veplayer',
  // VLCPLAYER = 'vlcplayer',
  CUSTOM = 'custom',
}
export type IPlayerType = `${PLAYER_TYPE}`;
export type IPlayerTypeWithoutCustom = Exclude<IPlayerType, 'custom'>;

export enum AIGC_PROVIDER_TYPE {
  AMZON = 'amazon',
  ANTHROPIC = 'anthropic',
  AZURE = 'azure',
  GOOGLE = 'google',
  OLLAMA = 'ollama',
  OPENAI = 'openai',
}
export type IAigcProviderType = `${AIGC_PROVIDER_TYPE}`;

export enum PROXY_TYPE {
  CUSTOM = 'custom',
  DIRECT = 'direct',
  SYSTEM = 'system',
}
export type IProxyType = `${PROXY_TYPE}`;
