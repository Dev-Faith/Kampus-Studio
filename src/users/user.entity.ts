import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../common/enums/role.enum';

/**
 * LESSON: Entities + serialization
 * `@Exclude()` (class-transformer) hides a field from responses. It only takes effect because
 * the global `ClassSerializerInterceptor` is registered, and only if you RETURN entity
 * instances (not hand-built plain objects).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  name: string;

  @Exclude()
  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'simple-enum', enum: Role, default: Role.User })
  role: Role;

  /** SHA-256 of the current refresh token (never the token itself). Enables rotation + logout. */
  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
