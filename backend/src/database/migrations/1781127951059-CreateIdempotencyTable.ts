import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIdempotencyTable1781127951059 implements MigrationInterface {
    name = 'CreateIdempotencyTable1781127951059'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."idempotency_record_status_enum" AS ENUM('IN_PROGRESS', 'SUCCESS', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "idempotency_record" ("idempotencyKey" character varying NOT NULL, "status" "public"."idempotency_record_status_enum" NOT NULL DEFAULT 'IN_PROGRESS', "responseCode" integer, "responseBody" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_07f550626f9fa7eec7e2456b642" PRIMARY KEY ("idempotencyKey"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "idempotency_record"`);
        await queryRunner.query(`DROP TYPE "public"."idempotency_record_status_enum"`);
    }

}
