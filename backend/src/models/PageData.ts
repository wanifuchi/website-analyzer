import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Analysis } from './Analysis';

@Entity('page_data')
export class PageData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Analysis, { onDelete: 'CASCADE' })
  analysis!: Analysis;

  @Column()
  analysisId!: string;

  @Column()
  url!: string;

  @Column()
  title!: string;

  @Column()
  statusCode!: number;

  @Column({ type: 'float' })
  loadTime!: number;

  @Column()
  contentType!: string;

  @Column()
  size!: number;

  @Column()
  depth!: number;

  @Column({ nullable: true })
  parentUrl?: string;

  @Column('jsonb')
  links!: string[];

  @Column('jsonb')
  images!: string[];

  @Column('jsonb')
  errors!: string[];

  @Column('text', { nullable: true })
  content?: string;

  @CreateDateColumn()
  crawledAt!: Date;
}