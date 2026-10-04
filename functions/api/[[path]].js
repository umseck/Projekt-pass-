import {handle} from '../../server/entry.mjs';
export const onRequest=context=>handle(context.request,context.env,context);
