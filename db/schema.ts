import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
// Authentication is platform-owned. No passwords are stored in application tables.
export const users = sqliteTable('users', { id: text('id').primaryKey(), createdAt: text('created_at').notNull() });
export const profiles = sqliteTable('student_profiles', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }), fullName: text('full_name').notNull(), faculty: text('faculty').notNull(), major: text('major').notNull(), studyYear: integer('study_year').notNull(), gpa: real('gpa').notNull(), updatedAt: text('updated_at').notNull(),
});
export const scholarships = sqliteTable('scholarships', { id: text('id').primaryKey(), title: text('title').notNull(), description: text('description').notNull(), provider: text('provider').notNull(), amount: integer('amount').notNull(), deadline: text('deadline').notNull(), category: text('category').notNull(), minGpa: real('min_gpa').notNull(), status: text('status').notNull() });
export const requirements = sqliteTable('scholarship_requirements', { id: text('id').primaryKey(), scholarshipId: text('scholarship_id').notNull().references(() => scholarships.id, { onDelete: 'cascade' }), documentName: text('document_name').notNull() });
export const eligibility = sqliteTable('scholarship_eligibility', { id: text('id').primaryKey(), scholarshipId: text('scholarship_id').notNull().references(() => scholarships.id, { onDelete: 'cascade' }), conditionType: text('condition_type').notNull(), conditionValue: text('condition_value').notNull() });
export const saved = sqliteTable('saved_scholarships', { id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), scholarshipId: text('scholarship_id').notNull().references(() => scholarships.id, { onDelete: 'cascade' }), savedAt: text('saved_at').notNull() }, t => [uniqueIndex('one_saved_per_user_scholarship').on(t.userId, t.scholarshipId)]);
export const checklist = sqliteTable('checklist_items', { id: text('id').primaryKey(), savedId: text('saved_id').notNull().references(() => saved.id, { onDelete: 'cascade' }), requirementId: text('requirement_id').notNull().references(() => requirements.id, { onDelete: 'cascade' }), completed: integer('completed').notNull().default(0), updatedAt: text('updated_at').notNull() }, t => [uniqueIndex('one_check_per_requirement').on(t.savedId, t.requirementId)]);
export const applications = sqliteTable('applications', { id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), scholarshipId: text('scholarship_id').notNull().references(() => scholarships.id), status: text('status').notNull(), consentVersion: text('consent_version').notNull(), createdAt: text('created_at').notNull() }, t => [uniqueIndex('one_application_per_user_scholarship').on(t.userId, t.scholarshipId)]);
export const integrationLogs = sqliteTable('integration_logs', { id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), partner: text('partner').notNull(), status: text('status').notNull(), httpStatus: integer('http_status'), durationMs: integer('duration_ms').notNull(), courseCount: integer('course_count').notNull(), createdAt: text('created_at').notNull() });
export const rateLimits = sqliteTable('rate_limits', { key: text('key').primaryKey(), hits: integer('hits').notNull(), expiresAt: integer('expires_at').notNull() });

// Accounts contain salted password hashes; users remain the business-data owner table.
export const authAccounts=sqliteTable('auth_accounts',{
 id:text('id').primaryKey(),username:text('username').notNull().unique(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),iterations:integer('iterations').notNull(),createdAt:text('created_at').notNull(),
});
export const authSessions=sqliteTable('auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>authAccounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull(),createdAt:text('created_at').notNull(),
});
export const providerLogs=sqliteTable('provider_access_logs',{
 id:text('id').primaryKey(),partner:text('partner').notNull(),method:text('method').notNull(),path:text('path').notNull(),createdAt:text('created_at').notNull(),
});
