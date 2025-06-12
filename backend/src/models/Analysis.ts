import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AnalysisStatus, AnalysisOptions, AnalysisResults } from '../types/analysis';

@Entity('analyses')
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  url!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  })
  status!: AnalysisStatus;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ default: 0 })
  totalPages!: number;

  @Column({ default: 0 })
  crawledPages!: number;

  @Column({ default: 0 })
  errorCount!: number;

  @Column('jsonb', { nullable: true })
  results?: AnalysisResults;

  @Column('jsonb')
  options!: AnalysisOptions;

  @UpdateDateColumn()
  updatedAt!: Date;
}