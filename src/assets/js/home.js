/* SMARTTRUST — home page: load each component's behaviour only if the component is on the page */
import { lazyWhenExists, onSalla } from './services/utils';

onSalla(() => {
  lazyWhenExists({ selector: '.st-hero', importer: () => import(/* webpackChunkName: "hero-video" */ './services/hero-video') });
  lazyWhenExists({ selector: '.st-float', importer: () => import(/* webpackChunkName: "floating-story" */ './services/floating-story') });
  lazyWhenExists({ selector: '.st-journey', importer: () => import(/* webpackChunkName: "journey" */ './services/journey') });
  lazyWhenExists({ selector: '.st-scenes', importer: () => import(/* webpackChunkName: "scenes" */ './services/scenes') });
});
