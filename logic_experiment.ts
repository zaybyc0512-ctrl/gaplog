
/**
 * Logic Experiment for GapLog
 * Task Estimation Logic Verification
 */

// --- 1. Data Structure Definitions ---

interface Context {
    id: string;
    name: string;
}

interface Category {
    id: string;
    contextId: string;
    name: string;
}

interface TaskMaster {
    id: string;
    categoryId: string;
    name: string;
    defaultUnitName: string; // e.g., 'page', 'question'
    defaultDurationMinutes: number; // Default time per unit
}

interface WorkLog {
    id: string;
    taskMasterId: string;
    actualTimeMinutes: number;
    amount: number;
    difficulty: 1 | 2 | 3; // 1: Easy, 2: Normal, 3: Hard
    timestamp: number; // Added for sorting
}

// --- 2. Calculation Logic ---

/**
 * Calculate estimated time for a task.
 * 
 * @param taskMasterId - ID of the task to perform
 * @param amount - Amount to perform
 * @param predictedDifficulty - User's predicted difficulty (1-3)
 * @param logs - All historical logs
 * @param taskMasters - Master data lookup (added to arguments for implementation)
 * @returns Estimated time in minutes
 */
function calculateEstimatedTime(
    taskMasterId: string,
    amount: number,
    predictedDifficulty: number,
    logs: WorkLog[],
    taskMasters: TaskMaster[]
): number {
    // Helper to find master
    const master = taskMasters.find(t => t.id === taskMasterId);
    if (!master) {
        throw new Error(`TaskMaster not found: ${taskMasterId}`);
    }

    // 1. Filtering
    const targetLogs = logs
        .filter(log => log.taskMasterId === taskMasterId)
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

    // 2. Base Unit Time Calculation (Weighted Average)
    let baseUnitTime = master.defaultDurationMinutes;

    if (targetLogs.length > 0) {
        // Use up to last 5 logs
        const recentLogs = targetLogs.slice(0, 5);
        
        let weightedSum = 0;
        let weightTotal = 0;

        recentLogs.forEach((log, index) => {
            // Weight: Newest=5, Oldest=1 (relative to the slice)
            // recentLogs is sorted new->old.
            // index 0 (newest) -> weight 5
            // index 4 (oldest in slice) -> weight 1
            const weight = 5 - index; 
            if (weight <= 0) return; // Should not happen with slice(0,5)

            const unitTime = log.actualTimeMinutes / log.amount;
            weightedSum += unitTime * weight;
            weightTotal += weight;
        });

        if (weightTotal > 0) {
            baseUnitTime = weightedSum / weightTotal;
        }
    }

    // 3. Difficulty Correction
    // Calculate personal multipliers for this user
    // Compare avg unit time of 'Hard' logs vs 'Normal' logs, etc.
    // For simplicity satisfying requirements:
    // "Calculate how much longer 'Hard' logs took compared to average."
    
    // We need a baseline average for this comparison. Let's use simple average of all logs for stability,
    // or just use the difficulty multipliers directly if we assume they are relative to "Normal".
    // Requirement says: "Calculate user specific tendency... e.g. if Hard takes 1.5x of average, multiplier is 1.5"
    
    // Let's compute average unit time across ALL logs for this task as the baseline.
    let difficultyMultiplier = 1.0;
    
    // Default multipliers
    const defaultMultipliers = { 1: 0.8, 2: 1.0, 3: 1.3 };

    if (targetLogs.length >= 5) {
        // Sufficient data to calculate custom multipliers?
        // Let's gather unit times by difficulty
        const logsByDiff: { [key: number]: number[] } = { 1: [], 2: [], 3: [] };
        let allUnitTimes: number[] = [];

        targetLogs.forEach(log => {
            const u = log.actualTimeMinutes / log.amount;
            logsByDiff[log.difficulty].push(u);
            allUnitTimes.push(u);
        });

        const overallAvg = allUnitTimes.reduce((a, b) => a + b, 0) / allUnitTimes.length;
        
        const targetDiffLogs = logsByDiff[predictedDifficulty];
        if (targetDiffLogs.length > 2) { // Logic: need some samples to trust it
             const targetAvg = targetDiffLogs.reduce((a, b) => a + b, 0) / targetDiffLogs.length;
             difficultyMultiplier = targetAvg / overallAvg;
             // Clamp or sanity check? Requirement doesn't specify, but let's keep it raw for now.
        } else {
             difficultyMultiplier = defaultMultipliers[predictedDifficulty as 1|2|3];
        }

    } else {
        // Not enough data, use defaults
         difficultyMultiplier = defaultMultipliers[predictedDifficulty as 1|2|3];
    }
    
    // 4. Final Calculation
    const finalTime = amount * baseUnitTime * difficultyMultiplier;
    
    return finalTime;
}


// --- 3. Test Cases ---

const mockContext: Context = { id: 'ctx1', name: 'School' };
const mockCategory: Category = { id: 'cat1', contextId: 'ctx1', name: 'Math' };

// Define two masters with different units
const masterMathPage: TaskMaster = { 
    id: 'tm_math_page', 
    categoryId: 'cat1', 
    name: 'Math Workbook', 
    defaultUnitName: 'page', 
    defaultDurationMinutes: 10 // 10 min/page default
};

const masterMathQuestion: TaskMaster = { 
    id: 'tm_math_q', 
    categoryId: 'cat1', 
    name: 'Math Exercises', 
    defaultUnitName: 'question', 
    defaultDurationMinutes: 2 // 2 min/question default
};

const masters = [masterMathPage, masterMathQuestion];

console.log("=== GapLog Logic Verification ===\n");

// Case 1: Cold Start
// No logs -> Should return default
const result1 = calculateEstimatedTime('tm_math_page', 2, 2, [], masters);
console.log(`Case 1 (Cold Start): Expected ${2 * 10 * 1.0} = 20`);
console.log(`Result: ${result1.toFixed(2)} min`);
console.log(Math.abs(result1 - 20) < 0.1 ? "✅ PASS" : "❌ FAIL");
console.log("---");

// Case 2: Learning Effect (Weighted Average)
// Old logs were slow (20 mins/page), Recent logs are fast (5 mins/page)
// We want to see prediction closer to 5 than 20.
// 5 logs: [Newest (5m), 5m, 10m, 20m, Oldest (20m)]
// Weights: 5, 4, 3, 2, 1
// Values: 5, 5, 10, 20, 20
// Weighted Sum: (5*5) + (5*4) + (10*3) + (20*2) + (20*1) = 25 + 20 + 30 + 40 + 20 = 135
// Total Weight: 5+4+3+2+1 = 15
// Avg: 135 / 15 = 9 min/page
const now = Date.now();
const logsCase2: WorkLog[] = [
    { id: 'l1', taskMasterId: 'tm_math_page', actualTimeMinutes: 5, amount: 1, difficulty: 2, timestamp: now },       // Newest
    { id: 'l2', taskMasterId: 'tm_math_page', actualTimeMinutes: 5, amount: 1, difficulty: 2, timestamp: now - 1000 },
    { id: 'l3', taskMasterId: 'tm_math_page', actualTimeMinutes: 10, amount: 1, difficulty: 2, timestamp: now - 2000 },
    { id: 'l4', taskMasterId: 'tm_math_page', actualTimeMinutes: 20, amount: 1, difficulty: 2, timestamp: now - 3000 },
    { id: 'l5', taskMasterId: 'tm_math_page', actualTimeMinutes: 20, amount: 1, difficulty: 2, timestamp: now - 4000 }, // Oldest
];

const result2 = calculateEstimatedTime('tm_math_page', 1, 2, logsCase2, masters); // 1 page, Normal difficulty
console.log(`Case 2 (Learning): Expected Weighted Avg 9.0`);
console.log(`Result: ${result2.toFixed(2)} min`);
console.log(Math.abs(result2 - 9.0) < 0.1 ? "✅ PASS" : "❌ FAIL");
console.log("---");

// Case 3: Difficulty Correction
// Same logs as Case 2 (Avg 9 min), but we predict "Hard" (3).
// Since we don't have enough 'Hard' logs in history to calculate custom factor, 
// it should use default "Hard" multiplier (1.3).
// Expected: 1 page * 9 min * 1.3 = 11.7 min
const result3 = calculateEstimatedTime('tm_math_page', 1, 3, logsCase2, masters);
console.log(`Case 3 (Difficulty Default): Expected 9.0 * 1.3 = 11.7`);
console.log(`Result: ${result3.toFixed(2)} min`);
console.log(Math.abs(result3 - 11.7) < 0.1 ? "✅ PASS" : "❌ FAIL");
console.log("---");

// Case 4: Unit Independence
// Add logs for 'Math Exercises' (Question unit). Check if 'Math Workbook' (Page unit) is affected.
// If we pass empty logs for 'tm_math_page' but full logs for 'tm_math_q', 
// 'tm_math_page' should still return default (Cold Start).
const logsCase4: WorkLog[] = [
    { id: 'l_other', taskMasterId: 'tm_math_q', actualTimeMinutes: 100, amount: 1, difficulty: 2, timestamp: now }
];
const result4 = calculateEstimatedTime('tm_math_page', 1, 2, logsCase4, masters);
console.log(`Case 4 (Independence): Expected Default 10.0 (Should ignore question logs)`);
console.log(`Result: ${result4.toFixed(2)} min`);
console.log(Math.abs(result4 - 10.0) < 0.1 ? "✅ PASS" : "❌ FAIL");
console.log("---");

// Case 5: Custom Difficulty Correction (Bonus)
// Let's add data where Hard is consistently 2x Normal.
// Normal logs: 10 min/page. Hard logs: 20 min/page.
// If we predict Hard, multiplier should be around 2.0 relative to overall average.
// Wait, my logic compares Difficulty Avg to Overall Avg.
// If 5 Normal (10m) and 5 Hard (20m). Overall Avg = 15m.
// Hard Avg = 20m. Multiplier = 20/15 = 1.33.
// Normal Avg = 10m. Multiplier = 10/15 = 0.66.
// Let's verify this behavior is what we implemented.
const logsCase5: WorkLog[] = [];
for(let i=0; i<5; i++) logsCase5.push({ id: `n${i}`, taskMasterId: 'tm_math_page', actualTimeMinutes: 10, amount: 1, difficulty: 2, timestamp: now - i });
for(let i=0; i<5; i++) logsCase5.push({ id: `h${i}`, taskMasterId: 'tm_math_page', actualTimeMinutes: 20, amount: 1, difficulty: 3, timestamp: now - 10 - i });

// Base Weighted Avg logic will heavily weight the *recent* logs.
// If we sort by timestamp, the recent ones (Hard? or Normal?) matter most.
// Let's say all these happened mixed. But weighted avg looks at RECENT 5.
// To test ONLY multiplier, we want stable Base Unit Time.
// Let's make them all same timestamp? Sort might be unstable.
// Let's just run it and see. Sort puts larger timestamp first.
// 'n' logs are newer (now - i). 'h' logs are older (now - 10 - i).
// So recent 5 are all Normal (10m). Base Unit Time = 10.
// Difficulty Multiplier Calculation uses ALL logs (if count >= 5).
// All logs: 5x10, 5x20. Overall Avg = 15.
// Target Difficulty: Hard (3). Hard Avg = 20.
// Multiplier = 20 / 15 = 1.333...
// Final Est = Amount(1) * Base(10) * Mult(1.333) = 13.33 min.
const result5 = calculateEstimatedTime('tm_math_page', 1, 3, logsCase5, masters);
console.log(`Case 5 (Custom Difficulty): Checking custom logic behavior...`);
console.log(`Base (Recent=Normal) ~ 10. Overall Avg = 15. Hard Avg = 20. Mult ~ 1.33`);
console.log(`Expected ~ 13.33`);
console.log(`Result: ${result5.toFixed(2)} min`);

