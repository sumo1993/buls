# Setup Supabase Storage for Loan Documents

## Step 1: Create Storage Bucket

1. Go to Supabase Dashboard
2. Click on **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `documents`
5. Set as **Public bucket** (check the box)
6. Click **Create bucket**

## Step 2: Set Storage Policies

After creating the bucket, you need to set up policies for file access.

### Go to Storage Policies:
1. Click on the `documents` bucket
2. Go to **Policies** tab
3. Click **New Policy**

### Policy 1: Allow Authenticated Users to Upload
- **Policy name**: `Allow authenticated users to upload`
- **Operation**: INSERT
- **Policy definition**:
```sql
(auth.role() = 'authenticated')
```
- **Target roles**: `authenticated`

### Policy 2: Allow Public Read Access
- **Policy name**: `Allow public read access`
- **Operation**: SELECT
- **Policy definition**:
```sql
true
```
- **Target roles**: `public`

### Policy 3: Allow Users to Update Their Own Files
- **Policy name**: `Allow users to update own files`
- **Operation**: UPDATE
- **Policy definition**:
```sql
(auth.role() = 'authenticated')
```
- **Target roles**: `authenticated`

## Alternative: Use SQL to Create Policies

Run this in Supabase SQL Editor:

```sql
-- Enable storage for documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

## Step 3: Verify Setup

1. Go back to Storage
2. Click on `documents` bucket
3. Try uploading a test file
4. Check if you can view the file URL

## File Structure

Uploaded loan applications will be stored as:
```
documents/
  loan-applications/
    {user_id}_{timestamp}.{extension}
```

## Security Notes

- Files are publicly readable (anyone with the URL can view)
- Only authenticated users can upload
- File size limit: 5MB (enforced in frontend)
- Allowed types: PDF, DOC, DOCX, JPG, PNG
