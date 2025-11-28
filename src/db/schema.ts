import { pgTable, integer, text, timestamp, real, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ============================================================================
// TABLES
// ============================================================================

/**
 * Exercises - Both predefined (user_id = null) and user-created (user_id set)
 * Predefined exercises are seeded and shared across all users
 * User exercises are custom and private to that user
 */
export const exercises = pgTable('exercises', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }), // null = predefined, non-null = user-created
  category: varchar('category', { length: 100 }), // e.g., 'chest', 'back', 'legs'
  muscleGroup: varchar('muscle_group', { length: 100 }), // e.g., 'pectorals', 'quadriceps'
  equipment: varchar('equipment', { length: 100 }), // e.g., 'barbell', 'dumbbell', 'bodyweight'
  description: text('description'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('exercises_user_id_idx').on(table.userId),
  categoryIdx: index('exercises_category_idx').on(table.category),
}));

/**
 * Workout Templates - Reusable workout plans
 * Users can create templates to quickly start workouts
 */
export const workoutTemplates = pgTable('workout_templates', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('workout_templates_user_id_idx').on(table.userId),
}));

/**
 * Template Exercises - Exercises in a template with ordering
 * Defines the structure of a template
 */
export const templateExercises = pgTable('template_exercises', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  templateId: integer('template_id').notNull().references(() => workoutTemplates.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id').notNull().references(() => exercises.id, { onDelete: 'restrict' }),
  order: integer('order').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  templateIdIdx: index('template_exercises_template_id_idx').on(table.templateId),
}));

/**
 * Workouts - Individual workout sessions
 * Can be created from a template or from scratch
 */
export const workouts = pgTable('workouts', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  templateId: integer('template_id').references(() => workoutTemplates.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // in seconds
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('workouts_user_id_idx').on(table.userId),
  startedAtIdx: index('workouts_started_at_idx').on(table.startedAt),
  userStartedIdx: index('workouts_user_started_idx').on(table.userId, table.startedAt),
}));

/**
 * Workout Exercises - Exercises performed in a specific workout
 * Junction table with additional data (order, notes)
 */
export const workoutExercises = pgTable('workout_exercises', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  workoutId: integer('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id').notNull().references(() => exercises.id, { onDelete: 'restrict' }),
  order: integer('order').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workoutIdIdx: index('workout_exercises_workout_id_idx').on(table.workoutId),
}));

/**
 * Sets - Individual sets performed for each exercise in a workout
 * Core performance tracking table
 */
export const sets = pgTable('sets', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  workoutExerciseId: integer('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps').notNull(),
  weight: real('weight').notNull(),
  rpe: real('rpe'), // Rate of Perceived Exertion (1-10)
  rir: integer('rir'), // Reps in Reserve
  isWarmup: boolean('is_warmup').default(false).notNull(),
  isDropSet: boolean('is_drop_set').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workoutExerciseIdIdx: index('sets_workout_exercise_id_idx').on(table.workoutExerciseId),
}));

// ============================================================================
// RELATIONS (for type-safe relational queries)
// ============================================================================

export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutExercises: many(workoutExercises),
  templateExercises: many(templateExercises),
}));

export const workoutTemplatesRelations = relations(workoutTemplates, ({ many }) => ({
  templateExercises: many(templateExercises),
  workouts: many(workouts),
}));

export const templateExercisesRelations = relations(templateExercises, ({ one }) => ({
  template: one(workoutTemplates, {
    fields: [templateExercises.templateId],
    references: [workoutTemplates.id],
  }),
  exercise: one(exercises, {
    fields: [templateExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  template: one(workoutTemplates, {
    fields: [workouts.templateId],
    references: [workoutTemplates.id],
  }),
  workoutExercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [workoutExercises.workoutId],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [workoutExercises.exerciseId],
    references: [exercises.id],
  }),
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [sets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));

// ============================================================================
// TYPES (for type-safe usage throughout the app)
// ============================================================================

export type Exercise = InferSelectModel<typeof exercises>;
export type NewExercise = InferInsertModel<typeof exercises>;

export type WorkoutTemplate = InferSelectModel<typeof workoutTemplates>;
export type NewWorkoutTemplate = InferInsertModel<typeof workoutTemplates>;

export type TemplateExercise = InferSelectModel<typeof templateExercises>;
export type NewTemplateExercise = InferInsertModel<typeof templateExercises>;

export type Workout = InferSelectModel<typeof workouts>;
export type NewWorkout = InferInsertModel<typeof workouts>;

export type WorkoutExercise = InferSelectModel<typeof workoutExercises>;
export type NewWorkoutExercise = InferInsertModel<typeof workoutExercises>;

export type Set = InferSelectModel<typeof sets>;
export type NewSet = InferInsertModel<typeof sets>;
