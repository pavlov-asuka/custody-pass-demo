package com.ccb.custodytraining.casepractice;

import java.util.List;

public final class CaseDto {

    private CaseDto() {
    }

    public record Summary(
            String id,
            CaseLine line,
            String title,
            String summary,
            String difficulty,
            int estimatedMinutes,
            boolean placeholder,
            String version
    ) {
        public static Summary from(CaseAsset asset) {
            return new Summary(asset.id(), asset.line(), asset.title(), asset.summary(),
                    asset.difficulty(), asset.estimatedMinutes(), asset.placeholder(), asset.version());
        }
    }

    public record Detail(
            String id,
            CaseLine line,
            String title,
            String summary,
            String difficulty,
            int estimatedMinutes,
            boolean placeholder,
            String version,
            String background,
            List<String> tasks
    ) {
        public static Detail from(CaseAsset asset) {
            return new Detail(asset.id(), asset.line(), asset.title(), asset.summary(),
                    asset.difficulty(), asset.estimatedMinutes(), asset.placeholder(), asset.version(),
                    asset.background(), asset.tasks());
        }
    }
}
