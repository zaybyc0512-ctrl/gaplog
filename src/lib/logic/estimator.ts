import { Database } from '@/types/supabase'

type TaskMaster = Database['public']['Tables']['task_masters']['Row']

// WorkLog interface compatible with Task row
type WorkLog = {
    id: string;
    master_id: string | null;
    estimated_time: number | null;
    actual_time?: number | null;
    difficulty_level: number | null;
    amount?: number | null;
    created_at: string;
}

/**
 * Calculate estimated time for a task using Hybrid Logic.
 * 
 * Logic:
 * 1. Cold Start (< 3 logs): Weighted Average of "Time per Amount" (Raw Unit Time).
 *    - Ignores difficulty curve nuances, assumes average conditions.
 * 2. Stable Phase (>= 3 logs): 
 *    - Reverse calculate "Base Unit Time" (Standardized to Normal Difficulty) from each log.
 *    - Average these Base Unit Times.
 *    - Apply CURRENT Difficulty Multiplier to the result.
 */
export function calculateEstimatedTime(
    master: TaskMaster,
    amount: number,
    predictedDifficulty: number,
    logs: WorkLog[]
): number {
    // 1. Filtering & Prioritization
    let targetLogs = logs
        .filter(log => log.master_id === master.id && (log.actual_time || log.estimated_time))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // [New Logic] Phase 6.4: Prioritize Actual Time
    // If we have records with actual_time, we use ONLY those to ensure the feedback loop works.
    // We strictly ignore "estimated only" records if "actual" records exist.
    const actualLogs = targetLogs.filter(log => log.actual_time !== null && log.actual_time !== undefined && log.actual_time > 0);

    if (actualLogs.length > 0) {
        console.log(`[Estimator] Found ${actualLogs.length} logs with Actual Time. using them exclusively.`);
        targetLogs = actualLogs;
    } else {
        console.log(`[Estimator] No logs with Actual Time found. Falling back to estimates.`);
    }

    const defaultUnitTime = master.default_unit_time || 10;

    // Difficulty Multipliers (1-5)
    // 1: 0.6, 2: 0.8, 3: 1.0 (Standard), 4: 1.3, 5: 1.6
    const multipliers: { [key: number]: number } = {
        1: 0.6,
        2: 0.8,
        3: 1.0,
        4: 1.3,
        5: 1.6
    };

    // Helper to get multiplier with default fallback
    const getMult = (d: number | null) => multipliers[d || 3] || 1.0;

    let finalTime = 0;

    if (targetLogs.length < 3) {
        // --- Cold Start Phase (< 3 logs) ---
        console.log(`[Estimator] Cold Start (${targetLogs.length} logs). Using simple weighted average.`);

        if (targetLogs.length === 0) {
            finalTime = amount * defaultUnitTime * getMult(predictedDifficulty);
        } else {
            let weightedSum = 0;
            let weightTotal = 0;
            // Weights for up to 2 items: Newest(10), Older(5)
            const weights = [10, 5];

            targetLogs.forEach((log, index) => {
                const weight = weights[index] || 1;
                const logAmount = log.amount || 1;
                // Use actual_time if available, else estimated_time (Phase 1 legacy fallback)
                const actualTime = (log.actual_time !== null && log.actual_time !== undefined)
                    ? log.actual_time
                    : (log.estimated_time || defaultUnitTime);

                const unitTime = actualTime / logAmount; // Raw unit time
                weightedSum += unitTime * weight;
                weightTotal += weight;
            });

            const avgUnitTime = weightedSum / weightTotal;
            // Apply current difficulty to the observed average
            finalTime = amount * avgUnitTime * getMult(predictedDifficulty);
        }

    } else {
        // --- Stable Phase (>= 3 logs) ---
        console.log(`[Estimator] Stable Phase (${targetLogs.length} logs). Using difficulty-normalized base time.`);

        // Use recent 5 logs
        const recentLogs = targetLogs.slice(0, 5);
        // Weights: Latest 50%, Next 30%, Previous 20%... for top 3
        const weights = [50, 30, 20, 10, 5];

        let weightedBaseSum = 0;
        let weightTotal = 0;

        recentLogs.forEach((log, index) => {
            if (index >= weights.length) return;
            const weight = weights[index];

            const logAmount = log.amount || 1;
            const logDiff = log.difficulty_level || 3;
            const logMult = getMult(logDiff);

            const actualTime = (log.actual_time !== null && log.actual_time !== undefined)
                ? log.actual_time
                : (log.estimated_time || defaultUnitTime);

            // Reverse calc: What was the base unit time for this task?
            // Actual = Amt * Base * Mult  =>  Base = Actual / (Amt * Mult)
            const observedBaseUnitTime = actualTime / (logAmount * logMult);

            console.log(`[Estimator] Log #${index}: Actual=${actualTime}, Amt=${logAmount}, Diff=${logDiff}(x${logMult}) => BaseUnit=${observedBaseUnitTime.toFixed(2)} (Weight=${weight})`);

            weightedBaseSum += observedBaseUnitTime * weight;
            weightTotal += weight;
        });

        const avgBaseUnitTime = weightedBaseSum / weightTotal;
        console.log(`[Estimator] Avg BaseUnitTime: ${avgBaseUnitTime.toFixed(2)}`);

        // Final Calculation
        const currentMult = getMult(predictedDifficulty);
        finalTime = amount * avgBaseUnitTime * currentMult;

        console.log(`[Estimator] Prediction: ${amount} * ${avgBaseUnitTime.toFixed(2)} * ${currentMult} = ${finalTime.toFixed(2)}`);
    }

    return Math.round(finalTime);
}
