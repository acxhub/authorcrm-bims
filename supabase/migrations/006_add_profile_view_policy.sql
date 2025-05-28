-- Add policy to allow users to view other users' profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true); 