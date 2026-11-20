import { lazyPageComponent } from "@/components/lazy-page-component";

export const { PageComponent: Ratings, prepare: prepareRatings } = lazyPageComponent(() => import("@/components/ratings"));
export const { PageComponent: Changelog, prepare: prepareChangelog } = lazyPageComponent(() => import("@/components/changelog"));
export const { PageComponent: Playground, prepare: preparePlayground } = lazyPageComponent(() => import("@/components/playground"));
