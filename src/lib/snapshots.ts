import { supabase } from "@/integrations/supabase/client";

export type Snapshot = {
  id: string;
  build_id: string;
  project_id: string;
  owner_id: string;
  label: string;
  note: string | null;
  created_at: string;
};

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("id, build_id, project_id, owner_id, label, note, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Snapshot[];
}

export async function createSnapshot(input: {
  buildId: string;
  projectId: string;
  label: string;
  note?: string;
}): Promise<Snapshot> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("snapshots")
    .insert({
      build_id: input.buildId,
      project_id: input.projectId,
      owner_id: userId,
      label: input.label,
      note: input.note ?? null,
    })
    .select("id, build_id, project_id, owner_id, label, note, created_at")
    .single();
  if (error) throw error;
  return data as Snapshot;
}

export async function deleteSnapshot(id: string): Promise<void> {
  const { error } = await supabase.from("snapshots").delete().eq("id", id);
  if (error) throw error;
}