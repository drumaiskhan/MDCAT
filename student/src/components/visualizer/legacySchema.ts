// Types retained for the original 2D renderers, separate from the current scene API.
import type { FormulaNode } from '@/lib/api';
export type { FormulaNode };
export type VizElement =
 | {kind:'shape';id:string;x:number;y:number;shapeType:'rect'|'circle'|'ellipse';width?:number;height?:number;radius?:number;color?:string;label?:string}
 | {kind:'label';id:string;x:number;y:number;text:string}
 | {kind:'arrow';id:string;fromId:string;toId:string;label?:string;style?:string}
 | {kind:'particle';id:string;fromId:string;toId:string;color?:string};
type Base={title:string;description:string};
export type VisualizationSpec = Base & (
 | {type:'process'|'cycle';steps:{title:string;description:string;elements:VizElement[];highlightIds?:string[]}[];loop?:boolean}
 | {type:'anatomy';elements:VizElement[]}
 | {type:'flowchart';nodes:{id:string;x:number;y:number;label:string}[];edges:{fromId:string;toId:string;label?:string}[]}
 | {type:'timeline';events:{time:string;label:string;description:string}[]}
 | {type:'comparison';items:{name:string;attributes:{label:string;value:string}[]}[]}
 | {type:'graph';chartType:'bar'|'line';xLabel:string;yLabel:string;series:{name:string;points:{x:number|string;y:number}[]}[]}
 | {type:'equation';variables:{name:string;label:string;default:number;unit?:string;min:number;max:number;step?:number}[];formula:FormulaNode;displayFormula:string;resultLabel:string;resultUnit?:string}
);
