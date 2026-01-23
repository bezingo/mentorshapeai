-- 008_profile_completion_trigger.sql
-- Creates function and triggers for auto-calculating profile completion percentage

-- Create the profile completion calculation function
create or replace function public.calculate_profile_completion(p_profile_id uuid)
returns integer as $$
declare
  v_completion integer := 0;
  v_profile record;
  v_work_count integer;
  v_edu_count integer;
  v_skill_count integer;
  v_traits_score integer;
begin
  -- Fetch the profile
  select * into v_profile from public.profiles where id = p_profile_id;

  if v_profile is null then
    return 0;
  end if;

  -- Avatar (5%): avatar_url IS NOT NULL
  if v_profile.avatar_url is not null and v_profile.avatar_url <> '' then
    v_completion := v_completion + 5;
  end if;

  -- Personal Info (10%): display_name IS NOT NULL AND headline IS NOT NULL
  if v_profile.display_name is not null and v_profile.display_name <> ''
     and v_profile.headline is not null and v_profile.headline <> '' then
    v_completion := v_completion + 10;
  end if;

  -- Location (5%): country IS NOT NULL AND city IS NOT NULL
  if v_profile.country is not null and v_profile.country <> ''
     and v_profile.city is not null and v_profile.city <> '' then
    v_completion := v_completion + 5;
  end if;

  -- Bio (10%): bio IS NOT NULL AND length(bio) > 0
  if v_profile.bio is not null and length(v_profile.bio) > 0 then
    v_completion := v_completion + 10;
  end if;

  -- Date of Birth (5%): date_of_birth IS NOT NULL
  if v_profile.date_of_birth is not null then
    v_completion := v_completion + 5;
  end if;

  -- Gender (5%): gender IS NOT NULL
  if v_profile.gender is not null and v_profile.gender <> '' then
    v_completion := v_completion + 5;
  end if;

  -- Nationality (5%): nationality IS NOT NULL
  if v_profile.nationality is not null and v_profile.nationality <> '' then
    v_completion := v_completion + 5;
  end if;

  -- Traits (20%): any of the trait arrays have content
  v_traits_score := 0;
  if coalesce(array_length(v_profile.languages_spoken, 1), 0) > 0 then
    v_traits_score := v_traits_score + 4;
  end if;
  if coalesce(array_length(v_profile.can_mentor_for, 1), 0) > 0 then
    v_traits_score := v_traits_score + 4;
  end if;
  if coalesce(array_length(v_profile.want_to_learn, 1), 0) > 0 then
    v_traits_score := v_traits_score + 4;
  end if;
  if coalesce(array_length(v_profile.specializations, 1), 0) > 0 then
    v_traits_score := v_traits_score + 4;
  end if;
  if coalesce(array_length(v_profile.hobbies, 1), 0) > 0 then
    v_traits_score := v_traits_score + 4;
  end if;
  v_completion := v_completion + v_traits_score;

  -- Work History (15%): Check work_experiences table count > 0
  select count(*) into v_work_count from public.work_experiences where profile_id = p_profile_id;
  if v_work_count > 0 then
    v_completion := v_completion + 15;
  end if;

  -- Education (10%): Check educations table count > 0
  select count(*) into v_edu_count from public.educations where profile_id = p_profile_id;
  if v_edu_count > 0 then
    v_completion := v_completion + 10;
  end if;

  -- Skills (10%): Check skills table count > 0
  select count(*) into v_skill_count from public.skills where profile_id = p_profile_id;
  if v_skill_count > 0 then
    v_completion := v_completion + 10;
  end if;

  return v_completion;
end;
$$ language plpgsql;

-- Create trigger function to update completion on profile changes
create or replace function public.trg_update_profile_completion()
returns trigger as $$
begin
  new.completion_percentage := public.calculate_profile_completion(new.id);
  return new;
end;
$$ language plpgsql;

-- Create trigger on profiles INSERT/UPDATE
drop trigger if exists trg_profiles_completion on public.profiles;
create trigger trg_profiles_completion
  before insert or update on public.profiles
  for each row
  execute function public.trg_update_profile_completion();

-- Create trigger function to recalculate parent profile on work_experiences changes
create or replace function public.trg_recalculate_profile_from_work()
returns trigger as $$
declare
  v_profile_id uuid;
  v_completion integer;
begin
  -- Get the profile_id from either OLD or NEW depending on operation
  if TG_OP = 'DELETE' then
    v_profile_id := old.profile_id;
  else
    v_profile_id := new.profile_id;
  end if;

  -- Recalculate and update the profile completion
  v_completion := public.calculate_profile_completion(v_profile_id);

  update public.profiles
  set completion_percentage = v_completion,
      updated_at = now()
  where id = v_profile_id;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql;

-- Create trigger on work_experiences INSERT/UPDATE/DELETE
drop trigger if exists trg_work_experiences_profile_completion on public.work_experiences;
create trigger trg_work_experiences_profile_completion
  after insert or update or delete on public.work_experiences
  for each row
  execute function public.trg_recalculate_profile_from_work();

-- Create trigger function to recalculate parent profile on educations changes
create or replace function public.trg_recalculate_profile_from_education()
returns trigger as $$
declare
  v_profile_id uuid;
  v_completion integer;
begin
  -- Get the profile_id from either OLD or NEW depending on operation
  if TG_OP = 'DELETE' then
    v_profile_id := old.profile_id;
  else
    v_profile_id := new.profile_id;
  end if;

  -- Recalculate and update the profile completion
  v_completion := public.calculate_profile_completion(v_profile_id);

  update public.profiles
  set completion_percentage = v_completion,
      updated_at = now()
  where id = v_profile_id;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql;

-- Create trigger on educations INSERT/UPDATE/DELETE
drop trigger if exists trg_educations_profile_completion on public.educations;
create trigger trg_educations_profile_completion
  after insert or update or delete on public.educations
  for each row
  execute function public.trg_recalculate_profile_from_education();

-- Create trigger function to recalculate parent profile on skills changes
create or replace function public.trg_recalculate_profile_from_skills()
returns trigger as $$
declare
  v_profile_id uuid;
  v_completion integer;
begin
  -- Get the profile_id from either OLD or NEW depending on operation
  if TG_OP = 'DELETE' then
    v_profile_id := old.profile_id;
  else
    v_profile_id := new.profile_id;
  end if;

  -- Recalculate and update the profile completion
  v_completion := public.calculate_profile_completion(v_profile_id);

  update public.profiles
  set completion_percentage = v_completion,
      updated_at = now()
  where id = v_profile_id;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql;

-- Create trigger on skills INSERT/UPDATE/DELETE
drop trigger if exists trg_skills_profile_completion on public.skills;
create trigger trg_skills_profile_completion
  after insert or update or delete on public.skills
  for each row
  execute function public.trg_recalculate_profile_from_skills();
