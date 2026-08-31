CREATE TABLE `bookings` (
	`id` varchar(64) NOT NULL,
	`person_id` varchar(64) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`payment_settled` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_valid_date_range` CHECK(`bookings`.`start_date` <= `bookings`.`end_date`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` varchar(64) NOT NULL,
	`first_name` text NOT NULL,
	`color` varchar(16) NOT NULL,
	`image_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` varchar(64) NOT NULL,
	`booking_id` varchar(64) NOT NULL,
	`uploader_id` varchar(64) NOT NULL,
	`photo_date` date NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`caption` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_person_id_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_uploader_id_people_id_fk` FOREIGN KEY (`uploader_id`) REFERENCES `people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bookings_start_idx` ON `bookings` (`start_date`);--> statement-breakpoint
CREATE INDEX `bookings_person_idx` ON `bookings` (`person_id`);--> statement-breakpoint
CREATE INDEX `photos_booking_idx` ON `photos` (`booking_id`);--> statement-breakpoint
CREATE INDEX `photos_uploader_idx` ON `photos` (`uploader_id`);--> statement-breakpoint
CREATE INDEX `photos_date_idx` ON `photos` (`photo_date`);--> statement-breakpoint
CREATE TABLE `booking_write_guard` (
	`id` tinyint NOT NULL,
	CONSTRAINT `booking_write_guard_id` PRIMARY KEY (`id`),
	CONSTRAINT `booking_write_guard_singleton` CHECK (`id` = 1)
);--> statement-breakpoint
INSERT INTO `booking_write_guard` (`id`) VALUES (1);--> statement-breakpoint
CREATE TRIGGER `bookings_no_overlap_insert`
BEFORE INSERT ON `bookings`
FOR EACH ROW
BEGIN
	UPDATE `booking_write_guard` SET `id` = `id` WHERE `id` = 1;
	IF EXISTS (
		SELECT 1
		FROM `bookings`
		WHERE `start_date` <= NEW.`end_date`
		  AND `end_date` >= NEW.`start_date`
	) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'bookings_no_overlap';
	END IF;
END;--> statement-breakpoint
CREATE TRIGGER `bookings_no_overlap_update`
BEFORE UPDATE ON `bookings`
FOR EACH ROW
BEGIN
	UPDATE `booking_write_guard` SET `id` = `id` WHERE `id` = 1;
	IF EXISTS (
		SELECT 1
		FROM `bookings`
		WHERE `id` <> OLD.`id`
		  AND `start_date` <= NEW.`end_date`
		  AND `end_date` >= NEW.`start_date`
	) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'bookings_no_overlap';
	END IF;
END;
