-- Job listings scraped from boards 
 CREATE TABLE job_listings ( 
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
   external_id TEXT, 
   title TEXT NOT NULL, 
   company TEXT NOT NULL, 
   location TEXT, 
   is_remote BOOLEAN DEFAULT false, 
   description TEXT, 
   url TEXT NOT NULL, 
   source TEXT NOT NULL, -- 'linkedin' | 'indeed' | 'pnet' | 'careers24' 
   stack_tags TEXT[], -- extracted tech stack keywords 
   salary_range TEXT, 
   posted_at TIMESTAMP, 
   scraped_at TIMESTAMP DEFAULT NOW(), 
   is_archived BOOLEAN DEFAULT FALSE, 
   UNIQUE(external_id, source) 
 ); 
 
 -- My job applications 
 CREATE TABLE job_applications ( 
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
   listing_id UUID REFERENCES job_listings(id), 
   status TEXT DEFAULT 'pending_review', 
   -- statuses: pending_review | confirmed | sent | awaiting | interview | rejected | withdrawn 
   cover_letter TEXT, 
   cv_snapshot JSONB, -- snapshot of CV data used at time of application 
   applied_at TIMESTAMP, 
   last_status_change TIMESTAMP DEFAULT NOW(), 
   notes TEXT, 
   email_thread_id TEXT, -- for email monitoring 
   created_at TIMESTAMP DEFAULT NOW() 
 ); 
 
 -- My CV/profile data (single row, upsert) 
 CREATE TABLE user_profile ( 
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
   full_name TEXT, 
   email TEXT, 
   phone TEXT, 
   location TEXT, 
   linkedin_url TEXT, 
   github_url TEXT, 
   portfolio_url TEXT, 
   summary TEXT, 
   skills TEXT[], 
   experience JSONB, -- array of { company, role, duration, description } 
   education JSONB, 
   updated_at TIMESTAMP DEFAULT NOW() 
 ); 
