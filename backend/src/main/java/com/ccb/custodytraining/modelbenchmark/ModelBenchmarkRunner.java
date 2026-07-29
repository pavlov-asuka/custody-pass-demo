package com.ccb.custodytraining.modelbenchmark;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.ccb.custodytraining.casepractice.CaseAsset;
import com.ccb.custodytraining.casepractice.CaseCatalog;
import com.ccb.custodytraining.casepractice.CaseDimension;
import com.ccb.custodytraining.casepractice.CasePoint;
import com.ccb.custodytraining.casepractice.CaseReviewer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

@Component
@Profile("model-benchmark")
public class ModelBenchmarkRunner implements ApplicationRunner {

    private final CaseCatalog caseCatalog;
    private final CaseReviewer caseReviewer;
    private final ObjectMapper objectMapper;
    private final ConfigurableApplicationContext applicationContext;
    private final String configuredRuns;

    public ModelBenchmarkRunner(CaseCatalog caseCatalog, CaseReviewer caseReviewer,
                                ObjectMapper objectMapper,
                                ConfigurableApplicationContext applicationContext,
                                @Value("${MODEL_BENCHMARK_RUNS:3}") String configuredRuns) {
        this.caseCatalog = caseCatalog;
        this.caseReviewer = caseReviewer;
        this.objectMapper = objectMapper;
        this.applicationContext = applicationContext;
        this.configuredRuns = configuredRuns;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        int runs;
        try {
            runs = parseRuns(configuredRuns);
        } catch (RuntimeException exception) {
            printAndFail(new Summary(0, 0, 0d, null, null, null, null, null, true, 1));
            return;
        }

        CaseAsset asset = caseCatalog.getRequired("C001");
        String syntheticAnswer = "这是用于模型基准的合成答案，仅覆盖部分交收、结算风险和监督要求，不含真实业务数据。";
        List<RunResult> results = new ArrayList<>();
        for (int index = 0; index < runs; index++) {
            long started = System.nanoTime();
            try {
                CaseReviewer.ReviewDraft draft = caseReviewer.review(asset, syntheticAnswer,
                        "MODEL_BENCHMARK_USER");
                int score = calculateScore(asset, draft);
                results.add(new RunResult(true, elapsedMillis(started), score));
            } catch (RuntimeException exception) {
                results.add(new RunResult(false, elapsedMillis(started), null));
            }
        }

        Summary summary = summarize(results);
        String json = objectMapper.writeValueAsString(summary);
        System.out.println(json);
        applicationContext.close();
        if (summary.hasFailure()) {
            System.exit(1);
        }
    }

    private int calculateScore(CaseAsset asset, CaseReviewer.ReviewDraft draft) {
        Map<String, CaseReviewer.PointDecision> decisions = new HashMap<>();
        for (CaseReviewer.PointDecision decision : draft.pointDecisions()) {
            decisions.put(decision.pointId(), decision);
        }
        int score = 0;
        for (CaseDimension dimension : CaseDimension.values()) {
            for (CasePoint point : asset.dimensions().get(dimension).points()) {
                CaseReviewer.PointDecision decision = decisions.get(point.pointId());
                if (decision == null) {
                    throw new IllegalStateException("基准评分点缺失");
                }
                if (decision.matched()) {
                    score += point.weight();
                }
            }
        }
        return score;
    }

    private Summary summarize(List<RunResult> results) {
        int runs = results.size();
        List<RunResult> successes = results.stream().filter(RunResult::success).toList();
        List<Long> durations = results.stream().map(RunResult::durationMillis).sorted().toList();
        List<Integer> scores = successes.stream().map(RunResult::score).sorted().toList();
        Integer minimum = scores.isEmpty() ? null : scores.get(0);
        Integer maximum = scores.isEmpty() ? null : scores.get(scores.size() - 1);
        return new Summary(runs, successes.size(), runs == 0 ? 0d : (double) successes.size() / runs,
                percentile(durations, 0.5d), percentile(durations, 0.95d), minimum, maximum,
                minimum == null ? null : maximum - minimum, successes.size() != runs,
                runs - successes.size());
    }

    private Long percentile(List<Long> sortedValues, double percentile) {
        if (sortedValues.isEmpty()) {
            return null;
        }
        int rank = (int) Math.ceil(percentile * sortedValues.size());
        return sortedValues.get(Math.max(0, rank - 1));
    }

    private void printAndFail(Summary summary) throws Exception {
        System.out.println(objectMapper.writeValueAsString(summary));
        applicationContext.close();
        System.exit(1);
    }

    private int parseRuns(String value) {
        int runs = Integer.parseInt(value);
        if (runs < 1 || runs > 10) {
            throw new IllegalArgumentException("runs out of range");
        }
        return runs;
    }

    private long elapsedMillis(long started) {
        return Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    private record RunResult(boolean success, long durationMillis, Integer score) {
    }

    private record Summary(int runs, int successCount, double structuredSuccessRate,
                           Long p50Millis, Long p95Millis, Integer minScore, Integer maxScore,
                           Integer scoreSpread, boolean hasFailure, int failureCount) {
    }
}
