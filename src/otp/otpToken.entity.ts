import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class otpToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  expiredAt: Date;

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
