CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scholarship_id` text NOT NULL,
	`status` text NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_application_per_user_scholarship` ON `applications` (`user_id`,`scholarship_id`);--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`saved_id` text NOT NULL,
	`requirement_id` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`saved_id`) REFERENCES `saved_scholarships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requirement_id`) REFERENCES `scholarship_requirements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_check_per_requirement` ON `checklist_items` (`saved_id`,`requirement_id`);--> statement-breakpoint
CREATE TABLE `scholarship_eligibility` (
	`id` text PRIMARY KEY NOT NULL,
	`scholarship_id` text NOT NULL,
	`condition_type` text NOT NULL,
	`condition_value` text NOT NULL,
	FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `integration_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`partner` text NOT NULL,
	`status` text NOT NULL,
	`http_status` integer,
	`duration_ms` integer NOT NULL,
	`course_count` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`faculty` text NOT NULL,
	`major` text NOT NULL,
	`study_year` integer NOT NULL,
	`gpa` real NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scholarship_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`scholarship_id` text NOT NULL,
	`document_name` text NOT NULL,
	FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `saved_scholarships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scholarship_id` text NOT NULL,
	`saved_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_saved_per_user_scholarship` ON `saved_scholarships` (`user_id`,`scholarship_id`);--> statement-breakpoint
CREATE TABLE `scholarships` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`provider` text NOT NULL,
	`amount` integer NOT NULL,
	`deadline` text NOT NULL,
	`category` text NOT NULL,
	`min_gpa` real NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
