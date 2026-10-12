import * as common from './common';
import * as finance from './finance';
import * as home from './home';
import * as market from './market';
import * as reports from './reports';

export const en = { ...common.en, ...home.en, ...finance.en, ...reports.en, ...market.en };
export const pt = { ...common.pt, ...home.pt, ...finance.pt, ...reports.pt, ...market.pt };

export type MessageKey = keyof typeof en;
