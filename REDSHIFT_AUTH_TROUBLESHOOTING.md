# Redshift Authentication Troubleshooting

## Error: Password Authentication Failed (28000)

If you see this error:
```
✗ Failed to start server: error: password authentication failed for user "data_engg"
```

## Common Causes & Solutions

### 1. Wrong Password

**Check:**
- Password in `.env` matches the actual Redshift password
- No extra spaces before/after password
- Password is on a single line (no line breaks)

**Fix:**
```env
# Correct
DB_PASSWORD=your_password_here

# Wrong (has trailing space)
DB_PASSWORD=your_password_here 

# Wrong (has quotes - don't quote unless needed)
DB_PASSWORD="your_password_here"
```

### 2. Special Characters in Password

If your password contains special characters, you may need to:
- Quote the password in `.env`
- URL encode special characters
- Escape special characters

**Examples:**
```env
# Password with special chars - try quoting
DB_PASSWORD="p@ssw0rd#123"

# Or escape special chars
DB_PASSWORD=p\@ssw0rd\#123
```

### 3. Password Not Set

**Check:**
- `DB_PASSWORD` is actually set in `.env`
- No typos in variable name (`DB_PASSWORD` not `DB_PASS`)

**Verify:**
```bash
cd backend
grep DB_PASSWORD .env
```

Should show:
```
DB_PASSWORD=your_actual_password
```

### 4. User Doesn't Exist or No Permissions

**Verify user exists:**
- Check with your Redshift admin
- User "data_engg" must exist in Redshift
- User must have proper permissions on database "amberdb"

### 5. Test Connection Manually

Test your credentials with `psql`:

```bash
psql -h redshift-prod.amber-data.com \
     -p 5439 \
     -U data_engg \
     -d amberdb
```

If this works, your credentials are correct. If it fails, the issue is with the credentials themselves.

### 6. Check .env File Format

Your `.env` file should look like:

```env
DB_HOST=redshift-prod.amber-data.com
DB_PORT=5439
DB_NAME=amberdb
DB_USER=data_engg
DB_PASSWORD=your_actual_password_here
DB_SSL=false
```

**Important:**
- No spaces around `=`
- No quotes unless password has special chars
- Each variable on its own line
- No trailing spaces

### 7. Verify Environment Variables Are Loaded

Add temporary debug output to verify:

```typescript
// In backend/src/index.ts (temporary)
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
```

## Quick Checklist

- [ ] Password is correct
- [ ] No extra spaces in password
- [ ] Password doesn't need special escaping
- [ ] User "data_engg" exists in Redshift
- [ ] User has permissions on "amberdb"
- [ ] `.env` file is in `backend/` directory
- [ ] `.env` file has correct format
- [ ] Can connect with `psql` using same credentials

## Still Not Working?

1. **Double-check credentials** with your team/Redshift admin
2. **Try resetting password** in Redshift (if you have access)
3. **Check Redshift logs** for more details
4. **Verify network access** to Redshift cluster
5. **Check security groups** allow your IP

## Alternative: Use Connection String

If environment variables aren't working, try a connection string:

```typescript
// In backend/src/db/connection.ts (temporary test)
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
const pool = new Pool({ connectionString });
```

## Need Help?

If you've tried all the above:
1. Verify credentials with Redshift admin
2. Check Redshift cluster status
3. Verify network/VPN connectivity
4. Check AWS security group rules
