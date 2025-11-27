
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fuiutzmkcwtuzjtbgfsg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aXV0em1rY3d0dXpqdGJnZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NDk5MDgsImV4cCI6MjA3OTUyNTkwOH0.BNkX4V-yzNELHmwjSGRocC2-doihH8cVzn-VtW38uqU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
