export interface MediaStorage {
    storeMediaObject(object : UnsavedMediaObject, options : { collectionName : string, fieldName : string, parent : any }) : Promise<string | number>
    getMediaObjectInfo(id : string | number) : Promise<MediaObjectInfo | null>
}

export interface UnsavedMediaObject {
    data : Buffer
    mimetype : string
}

export interface MediaObjectInfo {
    url : string
}
