import { Injectable, signal } from '@angular/core';
export type ToastKind = 'success'|'error'|'info';
export interface ToastMessage { id:number; kind:ToastKind; text:string }
@Injectable({providedIn:'root'}) export class ToastService { private nextID=0; readonly messages=signal<ToastMessage[]>([]); show(text:string,kind:ToastKind='info',duration=4000){const id=++this.nextID;this.messages.update(items=>[...items,{id,kind,text}]);window.setTimeout(()=>this.dismiss(id),duration)} success(text:string){this.show(text,'success')} error(text:string){this.show(text,'error',6000)} dismiss(id:number){this.messages.update(items=>items.filter(item=>item.id!==id))} }
