import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../../../amplify/data/resource';

const client:any = generateClient<Schema>();

type IModels = "WantedPlate" | "PlateDetection" | "PlateSighting";

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }

  async getData(type: IModels, options:any = { limit: 100 }){
    try {
      return await this.getClient(type).list({
        ...options,
        authMode: this.authMode(type)
      });
    } catch (error) {
      console.log('Error list data:',error);
      throw error;
    }
  }

  /** Recorre todas las páginas (nextToken) y devuelve todos los registros */
  async getAll(type: IModels, options:any = {}){
    const items: any[] = [];
    let nextToken: string | null | undefined = null;
    do {
      const { data, nextToken: token, errors } = await this.getData(type, { limit: 1000, ...options, nextToken });
      if (errors?.length) throw errors;
      items.push(...(data || []));
      nextToken = token;
    } while (nextToken);
    return items;
  }

  async query(name: string, args:any){
    try {
      return await client.queries[name](args, { authMode: 'userPool' });
    } catch (error) {
      console.log('Error query:',error);
      throw error;
    }
  }

  async createData(type: IModels, body:any){
    try {
      return await this.getClient(type).create(body, { authMode: this.authMode(type) });
    } catch (error) {
      console.log('Error list data:',error);
      throw error;
    }
  }

  async updateData(type: IModels, id:string, body:any){
    try {
      return await this.getClient(type).update({ ...body, id }, { authMode: this.authMode(type) });
    } catch (error) {
      console.log('Error list data:',error);
      throw error;
    }
  }

  async deleteData(type: IModels, id:string){
    try {
      return await this.getClient(type).delete({ id }, { authMode: this.authMode(type) });
    } catch (error) {
      console.log('Error al eliminar data:',error);
      throw error;
    }
  }

  /** Historial de lecturas de una placa (más recientes primero) */
  async sightingsByPlate(plate: string, limit = 500){
    const items: any[] = [];
    let nextToken: string | null | undefined = null;
    do {
      const { data, nextToken: token, errors }: any = await client.models.PlateSighting.listSightingsByPlate(
        { plate },
        { sortDirection: 'DESC', limit: Math.min(limit - items.length, 1000), nextToken, authMode: 'userPool' }
      );
      if (errors?.length) throw errors;
      items.push(...(data || []));
      nextToken = token;
    } while (nextToken && items.length < limit);
    return items;
  }

  /** Lecturas de un día (YYYY-MM-DD, hora de Colombia), más recientes primero */
  async sightingsByDay(day: string, limit = 5000){
    const items: any[] = [];
    let nextToken: string | null | undefined = null;
    do {
      const { data, nextToken: token, errors }: any = await client.models.PlateSighting.listSightingsByDay(
        { day },
        { sortDirection: 'DESC', limit: Math.min(limit - items.length, 1000), nextToken, authMode: 'userPool' }
      );
      if (errors?.length) throw errors;
      items.push(...(data || []));
      nextToken = token;
    } while (nextToken && items.length < limit);
    return items;
  }

  /** Suscripción en tiempo real a los registros creados */
  onCreate(type: IModels){
    return this.getClient(type).onCreate({ authMode: this.authMode(type) });
  }

  /** Todo el backend de SIA usa usuarios de Cognito (no hay API key) */
  private authMode(_type: IModels){
    return 'userPool';
  }

  private getClient(type: IModels){
    return client.models[type];
  }

}
