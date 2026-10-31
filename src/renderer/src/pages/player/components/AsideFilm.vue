<template>
  <div class="container-aside-wrap container-aside-film">
    <div v-if="!active.profile" class="container-wrap main-wrap">
      <div class="info-wrap">
        <div class="new-title-wrap">
          <div class="new-title-name">
            <div class="title txthide txthide1">{{ infoConf.vod_name }}</div>
            <div class="title-unfold intro-unfold" @click="active.profile = true">
              <span>{{ $t('pages.player.film.desc') }}</span>
              <span class="icon-title-right"><chevron-right-s-icon /></span>
            </div>
          </div>
          <div class="new-title-feature txthide txthide1">
            <span class="meta-info heat">{{ infoConf.vod_score ? infoConf.vod_score : '0.0' }} </span>
            <span v-show="infoConf.type_name" class="meta-info">{{ infoConf.type_name }}</span>
            <span v-show="infoConf.vod_area" class="meta-info">{{ infoConf.vod_area }}</span>
            <span v-show="infoConf.vod_year" class="meta-info">{{ infoConf.vod_year }}</span>
          </div>
        </div>
        <div class="play-paction">
          <div class="paction-item like" @click="handleSwitchStar">
            <heart-filled-icon v-if="starData.id" class="icon" />
            <heart-icon v-else class="icon" />
            <span class="tip">{{ $t('pages.moment.star.title') }}</span>
          </div>
          <t-divider layout="vertical" />

          <div class="paction-item download" @click="handleDownloadDialog">
            <download-icon class="icon" />
            <span class="tip">{{ $t('pages.player.function.download') }}</span>
          </div>
          <t-divider layout="vertical" />

          <div class="paction-item share" @click="handleSharePopup">
            <t-popup trigger="click">
              <share1-icon class="icon" />
              <span class="tip">{{ $t('component.share.title') }}</span>

              <template #content>
                <share-popup :data="shareFormData" type="popup" />
              </template>
            </t-popup>
          </div>
          <t-divider layout="vertical" />

          <div class="paction-item more">
            <t-dropdown trigger="click">
              <more-icon />

              <t-dropdown-menu>
                <t-dropdown-item>
                  <div class="setting-item" @click="handleSettingDialog">
                    <setting-icon />
                    {{ $t('pages.player.function.setting') }}
                  </div>
                </t-dropdown-item>
              </t-dropdown-menu>
            </t-dropdown>
          </div>
        </div>
        <dialog-download-view
          v-model:visible="active.download"
          :episode="downloadFormData.episode"
          :current="downloadFormData.current"
        />
        <dialog-setting-view
          v-model:visible="active.setting"
          type="film"
          :data="settingFormData"
          :time="processConf"
          @change="onSettingChange"
        />
      </div>

      <div class="anthology-container film-anthology">
        <div class="anthology-series-wrap">
          <tag-nav
            class="anthology-series-nav"
            :list="navOptions"
            :active="active.nav"
            @change="handleSwitchSeriesTab"
          />
          <div class="anthology-series-extra">
            <div v-show="activeAnalyzeList.length" class="anthology-series-parse">
              <t-dropdown placement="bottom" :max-height="250">
                <t-button class="anthology-series-btn" theme="default" variant="text" auto-width>
                  {{ $t('pages.parse.title') }}
                  <template #suffix><chevron-down-icon /></template>
                </t-button>
                <t-dropdown-menu>
                  <t-dropdown-item
                    v-for="item in activeAnalyzeList"
                    :key="item.id"
                    :active="item.id === active.analyzeId"
                    @click="handleSwitchParse(item.id)"
                  >
                    <span>{{ item.name }}</span>
                  </t-dropdown-item>
                </t-dropdown-menu>
              </t-dropdown>
            </div>

            <div class="anthology-series-reverse">
              <t-button
                class="anthology-series-btn"
                theme="default"
                variant="text"
                auto-width
                @click="reverseOrderEvent"
              >
                <template #suffix>
                  <order-descending-icon v-if="active.reverseOrder" class="reverse-icon" />
                  <order-ascending-icon v-else class="reverse-icon" />
                </template>
              </t-button>
            </div>
          </div>
        </div>
        <div class="box-anthology-wrap">
          <div v-if="active.nav === 'episode'" class="box-anthology-item box-anthology-episode">
            <div class="box-anthology-wrap">
              <div class="box-anthology-item">
                <div v-if="lineList.length > 1" class="box-anthology-header">
                  <title-menu :list="lineList" :active="active.filmSource" class="nav" @change="handleSwitchLine" />
                </div>
                <div class="box-anthology-content">
                  <div class="grid-wrap">
                    <div
                      v-for="(item, index) in activeSessionList"
                      :key="index"
                      class="item-wrap"
                      :class="[`${item.text}$${item.link}` === active.filmIndex ? 'is-active' : '']"
                      @click="handleSwitchSeason(item)"
                    >
                      <div class="list-item">
                        <t-tooltip :content="item.text">
                          <div class="title txthide txthide1">{{ reverseOrderIndex(index) }}</div>
                        </t-tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="active.nav === 'recommend'" class="box-anthology-item box-anthology-recommend">
            <div class="box-anthology-content">
              <t-list class="list-wrap" :scroll="{ rowHeight: 80, type: 'virtual' }">
                <t-list-item
                  v-for="(item, index) in recommendList"
                  :key="index"
                  class="item-wrap"
                  @click="handleSwitchRecommendItem(item)"
                >
                  <div class="list-item">
                    <div class="logo">
                      <t-image
                        class="logo-lazy"
                        fit="cover"
                        :src="cacheImageUrl(item.vod_pic)"
                        :lazy="true"
                        :loading="renderDefaultLazy"
                        :error="renderDefaultLazy"
                      />
                    </div>
                    <div class="title txthide txthide2">{{ item.vod_name }}</div>
                  </div>
                </t-list-item>
              </t-list>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="container-wrap intro-wrap">
      <div class="side-head">
        <div class="header">{{ $t('pages.player.film.desc') }}</div>
        <div class="close-btn" @click="active.profile = false">
          <close-icon class="t-icon t-icon-close" />
        </div>
      </div>
      <div class="side-body">
        <div class="new-intro-base">
          <t-image
            class="new-intro-img"
            :src="cacheImageUrl(infoConf.vod_pic)"
            fit="cover"
            shape="round"
            :lazy="true"
            :loading="renderDefaultLazy"
            :error="renderDefaultLazy"
          />
          <h4 class="title txthide txthide2">{{ infoConf.vod_name }}</h4>
        </div>
        <div class="new-intro-detail">
          <div class="new-intro-case">
            <div class="new-intro-title txthide txthide1">{{ $t('pages.player.film.info.background') }}</div>
            <div class="new-intro-content">
              <span class="txt" v-html="infoConf.vod_content || $t('common.unknown')"></span>
            </div>
          </div>
          <div class="new-intro-case">
            <div class="new-intro-title txthide txthide1">{{ $t('pages.player.film.info.actors') }}</div>
            <div class="new-intro-content">
              <div class="new-intro-roles new-intro-director">
                <span class="intro-role-title">{{ $t('pages.player.film.info.director') }}: </span>
                <span class="intro-role-subtitle">
                  {{ infoConf.vod_director || $t('common.unknown') }}
                </span>
              </div>
              <div class="new-intro-roles new-intro-actor">
                <span class="intro-role-title">{{ $t('pages.player.film.info.actor') }}: </span>
                <span class="intro-role-subtitle">
                  {{ infoConf.vod_actor || $t('common.unknown') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="tsx">
import { PROXY_API } from '@shared/config/env';
import {
  isArray,
  isArrayEmpty,
  isBoolean,
  isHttp,
  isNil,
  isObject,
  isObjectEmpty,
  isPositiveFiniteNumber,
} from '@shared/modules/validate';
import type { ICmsInfo, ICmsInfoEpisode, IRecMatch } from '@shared/types/cms';
import type { IModels } from '@shared/types/db';
import {
  ChevronDownIcon,
  ChevronRightSIcon,
  CloseIcon,
  DownloadIcon,
  HeartFilledIcon,
  HeartIcon,
  MoreIcon,
  OrderAscendingIcon,
  OrderDescendingIcon,
  SettingIcon,
  Share1Icon,
} from 'tdesign-icons-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PropType } from 'vue';
import { computed, onMounted, ref, toRaw, watch } from 'vue';

import {
  fetchCmsDetail,
  fetchCmsPlay,
  fetchCmsProxy,
  fetchCmsSearch,
  fetchRecBarrage,
  fetchRecMatch,
} from '@/api/film';
import { fetchAnalyzeActive, fetchParse } from '@/api/parse';
import { setProxy } from '@/api/proxy';
import { cdpSnifferMedia } from '@/api/system';
import LazyBg from '@/components/lazy-bg/index.vue';
import { mediaUtils } from '@/components/multi-player';
import SharePopup from '@/components/share/index.vue';
import TagNav from '@/components/tag-nav/index.vue';
import TitleMenu from '@/components/title-menu/index.vue';
import { emitterChannel } from '@/config/emitterChannel';
import type { IStorePlayer } from '@/config/player';
import { useHistory } from '@/hooks/useHistory';
import { useStar } from '@/hooks/useStar';
import { t } from '@/locales';
import type { IVideoOptions, IVideoProcess } from '@/types/player';
import emitter from '@/utils/emitter';
import { cacheImageUrl } from '@/utils/image';

import DialogDownloadView from './DialogDownload.vue';
import DialogSettingView from './DialogSetting.vue';

const props = defineProps({
  store: {
    type: Object as PropType<IStorePlayer>,
    default: () => ({}),
  },
  process: {
    type: Object as PropType<IVideoProcess>,
    default: () => ({ currentTime: 0, duration: 0 }),
  },
});

const emits = defineEmits(['update', 'barrage', 'create', 'pause', 'seek']);

const renderDefaultLazy = () => <LazyBg class="render-icon" />;

const DEFAULT_SKIP_TIME = 90;
const PRELOAD_TIME = 90;

const infoConf = ref(props.store.data.info as ICmsInfo);
const extraConf = ref(props.store.data.extra);
const playerConf = ref(props.store.setting);
const processConf = ref(props.process);

const lineList = ref<{ type_id: string; type_name: string }[]>([]);
const recommendList = ref<IRecMatch[]>([]);

const analyzeConfig = ref({
  default: {} as IModels['analyze'],
  list: [] as IModels['analyze'][],
});

const videoData = ref<IVideoOptions>({
  url: '',
  playEnd: false,
  watchTime: 0,
  duration: 0,
  skipTimeInStart: DEFAULT_SKIP_TIME,
  skipTimeInEnd: DEFAULT_SKIP_TIME,
});

const downloadFormData = ref({
  episode: {} as ICmsInfo['vod_episode'],
  current: '',
});
const shareFormData = ref({
  name: '',
  url: '',
  enablePrefix: true,
});
const settingFormData = ref({
  skipHeadAndEnd: false,
  skipTimeInStart: DEFAULT_SKIP_TIME,
  skipTimeInEnd: DEFAULT_SKIP_TIME,
  playNextPreload: false,
  playNextEnabled: true,
  skipAd: false,
});

const active = ref({
  watch: true,
  profile: false,
  nav: 'episode',
  reverseOrder: true,
  share: false,
  download: false,
  setting: false,
  analyzeId: '',
  filmIndex: '',
  filmSource: '',
  transitioning: false,
});

const preload = ref({
  status: 'idle' as 'idle' | 'ready' | 'loading' | 'error',
  id: '',
  url: '',
  quality: [] as Array<string | number>,
  headers: {} as Record<string, any>,
  mediaType: '',
});

const { starData, getStarData, handleSwitchStar, resetStarData } = useStar({
  source: infoConf,
  getQuery: (info) => ({
    relateId: extraConf.value.active.key,
    videoId: info.vod_id,
    type: 1,
  }),
  createDoc: (info) => ({
    type: 1,
    relateId: extraConf.value.active.key,
    videoId: info.vod_id,
    videoImage: info.vod_pic,
    videoName: info.vod_name,
    videoType: info.type_name,
    videoRemarks: info.vod_remarks,
  }),
});

const { historyData, getHistoryData, throttleSaveHistory, resetHistoryData } = useHistory({
  source: infoConf,
  getQuery: (info) => ({
    relateId: extraConf.value.active.key,
    videoId: info.vod_id,
    type: 1,
  }),
  createDoc: (info) => ({
    type: 1,
    relateId: extraConf.value.active.key,
    siteSource: active.value.filmSource,
    playEnd: videoData.value.playEnd,
    videoId: info.vod_id,
    videoImage: info.vod_pic,
    videoName: info.vod_name,
    videoIndex: active.value.filmIndex,
    watchTime: isPositiveFiniteNumber(videoData.value.watchTime) ? videoData.value.watchTime : 0,
    duration: isPositiveFiniteNumber(videoData.value.duration) ? videoData.value.duration : 0,
    skipTimeInStart: videoData.value.skipTimeInStart,
    skipTimeInEnd: videoData.value.skipTimeInEnd,
  }),
  onLoaded: (history) => {
    const { skipHeadAndEnd } = playerConf.value;
    const skipTimeInStart = history.skipTimeInStart ?? DEFAULT_SKIP_TIME;
    const skipTimeInEnd = history.skipTimeInEnd ?? DEFAULT_SKIP_TIME;
    const duration = history.duration ?? 0;
    const rawWatchTime = history.watchTime ?? 0;
    const playEnd = history.playEnd ?? false;
    videoData.value = {
      ...videoData.value,
      skipTimeInStart,
      skipTimeInEnd,
      duration,
      watchTime: skipHeadAndEnd ? Math.max(rawWatchTime, skipTimeInStart) : rawWatchTime,
      playEnd,
    };
  },
});

const navOptions = computed(() => [
  { value: 'episode', label: t('pages.player.film.anthology') },
  ...(recommendList.value.length ? [{ value: 'recommend', label: t('pages.player.film.recommend') }] : []),
]);

const activeAnalyzeList = computed(() => {
  const flag = active.value.filmSource;
  return analyzeConfig.value.list.filter((item) => (item.flag || []).includes(flag));
});

const activeSessionList = computed(() => {
  const flag = active.value.filmSource;
  return infoConf.value.vod_episode?.[flag] || [];
});

watch(
  () => props.store,
  (val) => {
    infoConf.value = val.data.info as ICmsInfo;
    extraConf.value = val.data.extra;
    playerConf.value = val.setting;
  },
  { deep: true },
);
watch(
  () => props.process,
  (val) => {
    if (!active.value.transitioning) processConf.value = val;
  },
);
watch(
  () => processConf.value,
  (val) => {
    if (active.value.watch) timerUpdatePlayProcess(val.currentTime, val.duration);
  },
);

onMounted(() => setup());

const defaultPreloadConfig = () => {
  preload.value = {
    status: 'idle',
    id: '',
    url: '',
    quality: [],
    headers: {},
    mediaType: '',
  };
};

const handleSwitchSeriesTab = (val: string) => {
  active.value.nav = val;
};

const handleDownloadDialog = () => {
  downloadFormData.value = {
    episode: infoConf.value.vod_episode,
    current: videoData.value.url,
  };

  active.value.download = true;
};

const handleSharePopup = () => {
  const [episodeName] = active.value.filmIndex.includes('$') ? active.value.filmIndex.split('$') : [''];
  const name = episodeName ? `${infoConf.value.vod_name}-${episodeName}` : infoConf.value.vod_name!;

  shareFormData.value = {
    ...shareFormData.value,
    name,
    url: videoData.value.url,
  };

  active.value.share = true;
};

const handleSettingDialog = () => {
  settingFormData.value = {
    skipHeadAndEnd: playerConf.value.skipHeadAndEnd,
    playNextPreload: playerConf.value.playNextPreload,
    playNextEnabled: playerConf.value.playNextEnabled,
    skipAd: playerConf.value.skipAd,
    skipTimeInStart: videoData.value.skipTimeInStart,
    skipTimeInEnd: videoData.value.skipTimeInEnd,
  };

  active.value.setting = true;
};

const onSettingChange = (item: typeof settingFormData.value) => {
  const {
    skipTimeInStart = DEFAULT_SKIP_TIME,
    skipTimeInEnd = DEFAULT_SKIP_TIME,
    skipHeadAndEnd,
    playNextPreload,
    playNextEnabled,
    skipAd,
  } = item;

  /** sync skip time */
  videoData.value.skipTimeInStart = skipTimeInStart;
  videoData.value.skipTimeInEnd = skipTimeInEnd;

  /** sync player config */
  playerConf.value.skipHeadAndEnd = skipHeadAndEnd;
  playerConf.value.playNextPreload = playNextPreload;
  playerConf.value.playNextEnabled = playNextEnabled;
  playerConf.value.skipAd = skipAd;

  emits('update', {
    setting: playerConf.value,
  });
};

const reverseOrderIndex = (current: number) => {
  const total = activeSessionList.value.length;

  if (!isPositiveFiniteNumber(current) || !isPositiveFiniteNumber(total)) return 1;
  if (current >= total) return 1;

  return active.value.reverseOrder ? current + 1 : total - current;
};

const handleSwitchLine = (id: string) => {
  active.value.filmSource = id;
};

const reverseOrderEvent = () => {
  const episodes = infoConf.value.vod_episode;
  if (!episodes) return;

  infoConf.value.vod_episode = Object.fromEntries(
    Object.entries(episodes).map(([key, arr]) => [key, arr.toReversed()]),
  );

  active.value.reverseOrder = !active.value.reverseOrder;
};

const getEpisodePlayState = (): {
  currIndex: number;
  nextIndex: number;
  isLast: boolean;
  reverseOrder: boolean;
  currentInfo: ICmsInfoEpisode;
  nextInfo: ICmsInfoEpisode;
} | null => {
  const { filmSource, filmIndex, reverseOrder } = active.value;
  const episode = infoConf.value.vod_episode;

  if (
    isNil(filmSource) ||
    isNil(filmIndex) ||
    !isBoolean(reverseOrder) ||
    !isObject(episode) ||
    isObjectEmpty(episode)
  ) {
    return null;
  }

  const currentEpisode = episode?.[filmSource];

  if (!isArray(currentEpisode) || isArrayEmpty(currentEpisode)) {
    return null;
  }

  const currIndex = currentEpisode.findIndex((item) => `${item.text}$${item.link}` === filmIndex);
  if (currIndex === -1) return null;

  const isLast = reverseOrder ? currIndex === currentEpisode.length - 1 : currIndex === 0;
  const nextIndex = isLast ? -1 : reverseOrder ? currIndex + 1 : currIndex - 1;
  const currentInfo = currentEpisode[currIndex];
  const nextInfo = isLast ? ({} as ICmsInfoEpisode) : currentEpisode[nextIndex];

  return {
    currIndex,
    nextIndex,
    isLast,
    reverseOrder,
    currentInfo,
    nextInfo,
  };
};

const handleSwitchSeason = async (item: ICmsInfoEpisode) => {
  active.value.transitioning = true;

  processConf.value = {
    currentTime: 0,
    duration: 0,
  };

  active.value.filmIndex = `${item.text}$${item.link}`;
  active.value.watch = false;

  if (active.value.filmIndex !== historyData.value.videoIndex) {
    videoData.value = {
      ...videoData.value,
      duration: 0,
      watchTime: playerConf.value.skipHeadAndEnd ? videoData.value.skipTimeInStart : 0,
      playEnd: false,
    };
  }

  await callPlay(item);

  /**
   * 解锁需要延迟到下一个 Task。
   * 避免 pause 排入的过期 timeupdate 在切集后再次同步。
   */
  setTimeout(() => {
    active.value.transitioning = false;
  }, 0);
};

const handleSwitchParse = async (id: string) => {
  active.value.analyzeId = id;

  if (active.value.filmIndex) {
    const [text, link] = active.value.filmIndex.split('$');
    await callPlay({ text, link });
  }
};

const getAnalyzeConfig = async () => {
  try {
    const resp = await fetchAnalyzeActive();

    if (resp?.default?.id) {
      analyzeConfig.value.default = resp.default;
      active.value.analyzeId = resp.default.id;
    }

    if (resp?.list) {
      analyzeConfig.value.list = resp.list;
    }
  } catch (error) {
    console.error('[player][getAnalyzeConfig]', error);
  }
};

const fetchRecommend = async () => {
  try {
    const { vod_name: name } = infoConf.value;
    const year = infoConf.value.vod_year || new Date().getFullYear();

    const res = await fetchRecMatch({
      name,
      year,
    });

    recommendList.value = res || [];
  } catch {
    recommendList.value = [];
  }
};

const handleSwitchRecommendItem = async (item: IRecMatch) => {
  const site = extraConf.value.active;

  const searchResp = await fetchCmsSearch({
    uuid: site.id,
    wd: item.vod_name,
    page: 1,
  });

  if (!isArray(searchResp.list) || isArrayEmpty(searchResp.list) || isNil(searchResp.list[0]?.vod_id)) {
    MessagePlugin.warning(t('pages.player.message.noRecMatch'));
    return;
  }

  const detailResp = await fetchCmsDetail({
    uuid: site.id,
    ids: searchResp.list[0].vod_id,
  });

  if (
    !isArray(detailResp.list) ||
    isArrayEmpty(detailResp.list) ||
    !isObject(detailResp.list[0]?.vod_episode) ||
    isObjectEmpty(detailResp.list[0]?.vod_episode)
  ) {
    MessagePlugin.warning(t('pages.film.message.noDetailInfo'));
    return;
  }

  const detail = detailResp.list[0];
  const searchItem = searchResp.list[0];

  const info = {
    ...detail,
    ...(detail?.vod_id ? {} : { vod_id: searchItem?.vod_id }),
    ...(detail?.vod_name ? {} : { vod_name: searchItem?.vod_name }),
    ...(detail?.vod_pic ? {} : { vod_pic: searchItem?.vod_pic }),
  };

  recommendList.value = [];
  resetStarData();
  resetHistoryData();

  active.value.reverseOrder = true;
  active.value.nav = 'episode';

  videoData.value = {
    url: '',
    playEnd: false,
    watchTime: 0,
    duration: 0,
    skipTimeInStart: DEFAULT_SKIP_TIME,
    skipTimeInEnd: DEFAULT_SKIP_TIME,
  };

  await emits('update', {
    data: toRaw({
      info,
      extra: extraConf.value,
    }),
  });

  setup();
};

const getDirectPlayUrl = async (
  item: ICmsInfoEpisode,
): Promise<{
  url: string;
  headers: Record<string, any>;
  quality: Array<string | number>;
  mediaType: string;
}> => {
  const playRes = await fetchCmsPlay({
    uuid: extraConf.value.active.id,
    play: item.link,
    flag: active.value.filmSource,
  });

  if (!playRes.url) throw new Error('No Play URL');

  const checkPlayable = async (
    url: string,
    headers: Record<string, any> = {},
  ): Promise<{
    url: string;
    headers: Record<string, any>;
    quality: Array<string | number>;
    mediaType: string;
  } | null> => {
    const mediaType = await mediaUtils.checkMediaType(url, headers);
    if (mediaType === 'unknown') return null;

    return {
      url,
      headers,
      mediaType,
      quality: [],
    };
  };

  // Direct play
  if (playRes.parse === 0 && playRes.jx !== 1) {
    if (playRes.url.startsWith(PROXY_API)) {
      const { searchParams } = new URL(playRes.url);
      const proxyParams = Object.fromEntries(searchParams.entries());

      const proxyData = await fetchCmsProxy({
        uuid: extraConf.value.active.id,
        ...proxyParams,
      });

      await setProxy({
        url: proxyParams.url,
        text: proxyData,
      });
    }

    const directed = await checkPlayable(playRes.url, playRes.headers);
    if (!isNil(directed)) {
      return {
        ...directed,
        quality: playRes.quality,
      };
    }
  }

  // Parse play
  if (playRes.parse === 1 && playRes.jx !== 1) {
    const parsed = await checkPlayable(playRes.url, playRes.headers);
    if (!isNil(parsed)) {
      return {
        ...parsed,
        quality: playRes.quality,
      };
    }
  }

  // Jx play
  if (playRes.jx === 1 || !isArrayEmpty(activeAnalyzeList.value)) {
    const parse = activeAnalyzeList.value.find((item: IModels['analyze']) => item.id === active.value.analyzeId);
    if (isNil(parse)) throw new Error('No Active Analyze');

    const jxResp = await fetchParse({
      id: parse.id,
      url: playRes.url,
    });

    const jxed = await checkPlayable(jxResp.url, jxResp.headers);
    if (jxed) return jxed;
  }

  // Sniffer play
  if (isHttp(playRes.url)) {
    const sniffResp = await cdpSnifferMedia({
      url: playRes.url,
      options: {
        runScript: playRes.script.runScript,
        initScript: playRes.script.initScript,
        customRegex: playRes.script.customRegex,
        snifferExclude: playRes.script.snifferExclude,
        headers: playRes.headers,
      },
    });

    const sniffed = await checkPlayable(sniffResp.url, playRes.headers);
    if (!isNil(sniffed)) return sniffed;
  }

  throw new Error('No Play URL');
};

const callBarrage = async (item: ICmsInfoEpisode) => {
  try {
    const res = await fetchRecBarrage({ id: item.link });
    if (!isArray(res.list) || isArrayEmpty(res.list)) return;

    emits('barrage', {
      list: res.list,
      id: res.id,
    });
  } catch {}
};

const callPlay = async (item: ICmsInfoEpisode) => {
  try {
    const isPreload = preload.value.status === 'ready' && preload.value.id === item.link;

    const res = isPreload
      ? {
          url: preload.value.url,
          quality: preload.value.quality,
          headers: preload.value.headers,
          mediaType: preload.value.mediaType,
        }
      : await getDirectPlayUrl(item);

    videoData.value.url = res.url;

    if (isPreload) videoData.value.watchTime = playerConf.value.skipHeadAndEnd ? videoData.value.skipTimeInStart : 0;

    await emits('create', {
      url: res.url,
      quality: res.quality,
      headers: res.headers,
      startTime: videoData.value.watchTime,
      skipAd: playerConf.value.skipAd,
      next: !getEpisodePlayState()?.isLast,
    });

    callBarrage(item);

    active.value.watch = true;
  } catch (error) {
    console.error(`[player][callPlay][error]`, error);

    const msg = (error as Error).message;
    if (msg === 'No Play URL') {
      MessagePlugin.warning(t('pages.player.message.noPlayUrl'));
    } else if (msg === 'No Active Analyze') {
      MessagePlugin.warning(t('pages.player.message.noActiveAnalyze'));
    } else {
      MessagePlugin.error(`${t('common.error')}: ${msg}`);
    }
  } finally {
    defaultPreloadConfig();
  }
};

const timerUpdatePlayProcess = async (currentTime: number, duration: number) => {
  if (!isPositiveFiniteNumber(currentTime) || !isPositiveFiniteNumber(duration)) return;
  if (currentTime <= 0 || duration <= 0) return;

  const state = getEpisodePlayState();
  if (!state) return;

  const { skipTimeInStart, skipTimeInEnd } = videoData.value;
  const { skipHeadAndEnd, playNextEnabled, playNextPreload } = playerConf.value;

  /** skip head */
  if (skipHeadAndEnd && skipTimeInStart < duration && currentTime < skipTimeInStart) {
    emits('seek', skipTimeInStart);
    return;
  }

  /** unified watch time */
  const watchTime = skipHeadAndEnd ? currentTime + skipTimeInEnd : currentTime;
  const isPlayEnd = watchTime >= duration;

  // console.debug(`timeUpdate`, {
  //   currentTime,
  //   watchTime,
  //   duration,
  //   percentage: Math.trunc((currentTime / duration) * 100),
  // });

  /** update history */
  videoData.value = {
    ...videoData.value,
    watchTime,
    duration,
    playEnd: isPlayEnd,
  };

  throttleSaveHistory();

  /** play next episode */
  if (isPlayEnd && playNextEnabled && !state.isLast) {
    emits('pause');
    await handleSwitchSeason(state.nextInfo);
    return;
  }

  /** preload next episode */
  const preloadWatchTime = skipHeadAndEnd ? currentTime + PRELOAD_TIME + skipTimeInEnd : currentTime + PRELOAD_TIME;
  if (playNextPreload && !state.isLast && preload.value.status === 'idle' && preloadWatchTime >= duration) {
    preload.value.status = 'loading';

    try {
      const nextd = await getDirectPlayUrl(state.nextInfo);
      if (isNil(nextd)) return;

      preload.value = {
        ...preload.value,
        ...nextd,
        id: state.nextInfo.link,
        status: 'ready',
      };
    } catch (error) {
      preload.value.status = 'error';
      console.error(`[player][timeUpdate][preloadNext][error]`, error);
    }
  }
};

const setup = async () => {
  const episode = infoConf.value.vod_episode;
  if (!isObject(episode) || isObjectEmpty(episode)) return;

  const episodeKeys = Object.keys(episode);
  let filmSource = episodeKeys[0];
  let flimEpisode = episode[filmSource]?.[0];

  if (!isObject(flimEpisode) || isObjectEmpty(flimEpisode)) return;

  let filmIndex = `${flimEpisode.text}$${flimEpisode.link}`;

  lineList.value = episodeKeys.map((key) => ({
    type_id: key,
    type_name: key,
  }));

  await getHistoryData();

  if (historyData.value.siteSource && episode[historyData.value.siteSource]) filmSource = historyData.value.siteSource;
  if (historyData.value.videoIndex) filmIndex = historyData.value.videoIndex;

  active.value.filmSource = filmSource;
  active.value.filmIndex = filmIndex;

  flimEpisode = { text: filmIndex.split('$')[0], link: filmIndex.split('$')[1] };

  await getAnalyzeConfig();
  await callPlay(flimEpisode);

  getStarData();
  fetchRecommend();
};

emitter.on(emitterChannel.COMP_MULTI_PLAYER_PLAYNEXT, async () => {
  const state = getEpisodePlayState();
  if (!isBoolean(state?.isLast) || isNil(state?.nextIndex) || state?.nextIndex === -1) return;

  const nextInfo = state.nextInfo;
  await handleSwitchSeason(nextInfo);
});
</script>
<style lang="less" scoped></style>
