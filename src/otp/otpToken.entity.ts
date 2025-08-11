import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class OtpToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  createdBy: string;

  @Column({
    type: 'timestamp',
  })
  expiresAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  usedAt: Date;

  @Column({
    nullable: true,
  })
  usedBy: string;
}
