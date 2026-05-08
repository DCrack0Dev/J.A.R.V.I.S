export interface ScrapedJob { 
   externalId: string; 
   title: string; 
   company: string; 
   location: string; 
   isRemote: boolean; 
   description: string; 
   url: string; 
   source: string; 
   postedAt?: Date; 
 } 
 
 export interface SearchCriteria { 
   keywords: string[]; 
   location: string; 
   remoteOnly: boolean; 
   excludeKeywords?: string[]; 
   sources?: ('pnet' | 'careers24' | 'indeed' | 'linkedin')[]; 
 } 
 
 export type ApplicationStatus = 'pending_review' | 'confirmed' | 'sent' | 'awaiting' | 'interview' | 'rejected' | 'withdrawn'; 
