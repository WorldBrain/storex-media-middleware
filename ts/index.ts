import { StorageRegistry } from "@worldbrain/storex";
import { StorageMiddleware } from "@worldbrain/storex/lib/types/middleware";
import { UnsavedMediaObject, MediaObjectInfo, MediaStorage } from './types';

type CollectionInfoMap = {[collection : string] : CollectionInfo}
interface CollectionInfo {
    mediaFields : string[]
}
interface OperationHandlerOptions {
    collectionName : string
    collectionInfo : CollectionInfo,
    next: { process: ({ operation } : { operation : any[] }) => any }
}

const INTERCEPTED_OPERATIONS : Set<string> = new Set(['createObject', 'findObject', 'findObjects'])

export class MediaStorageMiddleware implements StorageMiddleware {
    private collectionInfoMap : {[name : string] : CollectionInfo}

    constructor(private options : { mediaStorage : MediaStorage, storageRegistry : StorageRegistry }) {
        this.collectionInfoMap = getCollectionInfoMap(options.storageRegistry)
    }

    async process(context: {
        next: { process: ({ operation }: { operation: any; }) => any },
        operation: any[];
    }): Promise<any> {
        const next = () => context.next.process({ operation: context.operation })

        const [operationName, collectionName] = context.operation
        if (!INTERCEPTED_OPERATIONS.has(operationName)) {
            return next()
        }

        const collectionInfo = this.collectionInfoMap[collectionName]
        if (!collectionInfo) {
            return next()
        }

        const handlerOptions : OperationHandlerOptions = {
            collectionName, collectionInfo, next: context.next 
        }
        if (operationName === 'createObject') {
            return this.createWithMedia(context.operation, handlerOptions)
        } else if (operationName === 'findObject') {
            return this.findObjectWithMedia(context.operation, handlerOptions)
        } else {
            return next()
        }
    }

    async createWithMedia(operation : any[], options : OperationHandlerOptions) {
        const originalObject = operation[2]
            
        const mediaObjects : {[fieldName : string] : { reference : string }} = {}
        await Promise.all(options.collectionInfo.mediaFields.map(async fieldName => {
            const unsavedMediaObject = originalObject[fieldName] as UnsavedMediaObject
            const mediaPk = await this.options.mediaStorage.storeMediaObject(unsavedMediaObject)
            const reference = `media:${mediaPk}`
            mediaObjects[fieldName] = { reference }
        }))

        const modifiedObject = {...originalObject}
        for (const [fieldName, mediaObject] of Object.entries(mediaObjects)) {
            modifiedObject[fieldName] = mediaObject.reference
        }

        return options.next.process({ operation: ['createObject', options.collectionName, modifiedObject] })
    }

    async findObjectWithMedia(operation : any[], options : OperationHandlerOptions) {
        const next = () => options.next.process({ operation })
        
        const foundObject = await next()
        if (!foundObject) {
            return null
        }

        await Promise.all(options.collectionInfo.mediaFields.map(async fieldName => {
            const mediaReference = foundObject[fieldName]
            const match = /^media:(.+)$/.exec(mediaReference)
            if (!match || match.length !== 2) {
                throw new Error(`Found '${options.collectionName}' object with invalid media reference stored in field '${fieldName}'`)
            }
            const mediaId = match[1]

            foundObject[fieldName] = await this.options.mediaStorage.getMediaObjectInfo(mediaId)
        }))
        
        return foundObject
    }
}

function getCollectionInfoMap(storageRegistry : StorageRegistry) : CollectionInfoMap {
    const collectionInfoMap : CollectionInfoMap = {}
    for (const [collectionName, collectionDefinition] of Object.entries(storageRegistry.collections)) {
        const mediaFields = Object.entries(collectionDefinition.fields)
            .filter(([fieldName, fieldDefiniton]) => fieldDefiniton.type === 'media')
            .map(([key]) => key)
        collectionInfoMap[collectionName] = { mediaFields }
    }
    return collectionInfoMap
}
