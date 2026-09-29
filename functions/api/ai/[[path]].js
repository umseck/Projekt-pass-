import {handleAI} from '../../../server/ai-api.mjs';
export const onRequest=context=>handleAI(context.request,context.env);
