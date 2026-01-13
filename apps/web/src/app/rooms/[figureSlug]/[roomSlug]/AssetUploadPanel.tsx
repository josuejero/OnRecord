import { uploadAsset } from './actions';
import { Button } from '@/components/ui/button';

export function AssetUploadPanel(props: { sessionId: string; revalidatePath: string }) {
  return (
    <section className="mt-8 rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Assets</h2>
      <p className="text-sm text-muted-foreground">
        Upload a file as a public recap asset (visible on the public recap page) or a private session asset.
      </p>

      <form className="mt-4 flex flex-col gap-3" action={uploadAsset} encType="multipart/form-data">
        <input type="hidden" name="session_id" value={props.sessionId} />
        <input type="hidden" name="revalidate_path" value={props.revalidatePath} />

        <label className="text-sm font-medium">Visibility</label>
        <select
          name="visibility"
          defaultValue="public"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          data-testid="asset-visibility"
        >
          <option value="public">Public recap asset</option>
          <option value="private">Private session asset</option>
        </select>

        <label className="text-sm font-medium">File</label>
        <input type="file" name="file" required className="text-sm" data-testid="asset-file" />

        <div className="flex items-center gap-2">
          <Button type="submit" data-testid="asset-submit">Upload</Button>
          <p className="text-xs text-muted-foreground">Recommended: images, PDF, text. Max 25MB.</p>
        </div>
      </form>
    </section>
  );
}
