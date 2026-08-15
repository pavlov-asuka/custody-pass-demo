package com.ccb.custodytraining.learning;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Text used at the learner-facing boundary.
 *
 * <p>The rubric and the model both contain internal scoring information.  This
 * class deliberately builds public feedback from business descriptions, never
 * from expected values or internal item identifiers.</p>
 */
final class HumanFeedbackText {

    private static final Pattern NUMBER = Pattern.compile(
            "(?<![A-Za-z])[-+]?\\d+(?:[,.]\\d+)*(?:\\.\\d+)?%?(?![A-Za-z])");
    private static final Pattern NUMBER_WITH_UNIT = Pattern.compile(
            "(?<![A-Za-z])[-+]?\\d+(?:[,.]\\d+)*(?:\\.\\d+)?%?(?:元|份|股|张|天|日|次|位|年|月|人|项|笔|户|家|档|条)?(?![A-Za-z])");
    private static final Pattern UPPER_TOKEN = Pattern.compile("(?<![A-Za-z])[A-Z][A-Z0-9_]{2,}(?![A-Za-z])");
    private static final Pattern LOWER_CAMEL = Pattern.compile(
            "(?<![A-Za-z0-9])[a-z]+(?:[A-Z][A-Za-z0-9]*)+(?![A-Za-z0-9])");
    private static final Pattern MIXED_CAMEL = Pattern.compile(
            "(?<![A-Za-z0-9])[A-Z]{2,}[a-z][A-Za-z0-9]*(?![A-Za-z0-9])");
    private static final Pattern HYPHEN_CODE = Pattern.compile("\\b(?:[A-Z][A-Z0-9]*-){1,}[A-Z0-9-]+\\b");
    private static final List<String> PUBLIC_ABBREVIATIONS = List.of(
            "NAV", "TA", "DVP", "PCF", "EIR", "IRR", "LOMD", "YIELD", "XBRL", "ETF", "FOF");
    private static final List<String> BUSINESS_ANCHORS = List.of(
            "资料", "来源", "字段", "金额", "数量", "份额", "持仓", "成本", "费用", "佣金", "资金",
            "余额", "市值", "估值", "净值", "净资产", "资产", "负债", "收益", "利息", "本金", "价格",
            "状态", "日期", "期间", "计算", "复算", "公式", "科目", "凭证", "台账", "账簿", "对账",
            "勾稽", "差额", "结论", "方向", "清算", "交收", "支付", "到账", "确认", "交易", "买入",
            "卖出", "应付", "公告", "报告", "附件", "对象", "版本", "复核", "归档", "数据", "证券",
            "账户", "单位", "分配", "税", "期间费用", "实际", "依据", "记录", "产品", "篮子", "份额",
            "NAV", "TA", "DVP", "PCF", "EIR", "IRR", "LOMD", "YIELD", "READY", "MATCHED");

    private static final List<String> UNSAFE_PHRASES = List.of(
            "能力已体现", "能力尚未体现", "尚未充分体现", "未充分体现", "能力未体现", "结构化作答",
            "结构化工作纸", "工作纸已满足", "作答已满足", "作答未满足", "项目已满足", "答案证据",
            "证据一", "证据二", "未见对应说明", "评分技术", "评分器",
            "评测器", "referenceAnswer", "evidenceRules", "criterionId", "requirementId", "itemId",
            "fieldId", "optionId", "sourceId", "availableAt", "remediationTargetId", "MODEL_",
            "JSON", "标准答案", "参考答案", "正确答案", "对应状态", "对应数值");

    private static final List<String> INTERNAL_LABELS = List.of(
            "fieldId", "optionId", "itemId",
            "criterionId", "requirementId", "remediationTargetId");

    private static final Map<String, String> INLINE_TECHNICAL_LABELS = Map.ofEntries(
            Map.entry("actualCash", "实际到账资金"),
            Map.entry("approvedRate", "批准费率"),
            Map.entry("approvedShares", "批准份额"),
            Map.entry("sourceId", "来源标识"),
            Map.entry("sourceVersion", "来源版本"),
            Map.entry("sourceSnapshot", "来源快照"),
            Map.entry("availableAt", "资料可用时间"),
            Map.entry("archiveId", "归档记录"),
            Map.entry("receivableAmount", "应收金额"),
            Map.entry("approvedNAV", "批准净值"),
            Map.entry("confirmedAmount", "确认金额"),
            Map.entry("confirmedShares", "确认份额"),
            Map.entry("openingShares", "期初份额"),
            Map.entry("closingShares", "期末份额"),
            Map.entry("parsedRows", "已解析行数"),
            Map.entry("mappedRows", "已对应行数"),
            Map.entry("recordCount", "记录条数"),
            Map.entry("parseStatus", "解析状态"),
            Map.entry("mappingStatus", "资料对应结果"),
            Map.entry("valuationResult", "估值结果"),
            Map.entry("marketValue", "市值"),
            Map.entry("holdingDiff", "持仓差额"),
            Map.entry("valuationDiff", "估值差额"),
            Map.entry("cashDiff", "资金差额"),
            Map.entry("shareDiff", "份额差额"),
            Map.entry("sharesDiff", "份额差额"),
            Map.entry("returnDiff", "返还差额"),
            Map.entry("remaining", "待结余额"),
            Map.entry("deliveryChoice", "交付方式"),
            Map.entry("reserveMovement", "备付金变动"),
            Map.entry("reserveClose", "期末备付金"),
            Map.entry("postingCount", "入账次数"),
            Map.entry("gross", "成交毛额"),
            Map.entry("commission", "佣金"),
            Map.entry("settlement", "交收金额"),
            Map.entry("TAShares", "TA 份额"),
            Map.entry("TAClosingShares", "TA 期末份额"),
            Map.entry("taShares", "TA 份额"),
            Map.entry("taClosingShares", "TA 期末份额"),
            Map.entry("internalClosingShares", "内部期末份额"),
            Map.entry("reserveOpen", "期初备付金"),
            Map.entry("formulaDiff", "公式差额"),
            Map.entry("reserveFormulaDiff", "备付金公式差额"),
            Map.entry("calculatedMarketValue", "计算市值"),
            Map.entry("oleObject1", "OLE 对象"),
            Map.entry("oleObject7", "OLE 对象"));

    private static final Map<String, String> UPPER_WORD_LABELS = Map.ofEntries(
            Map.entry("AP", "申赎参与人"),
            Map.entry("ACCOUNTING", "核算"), Map.entry("BROKER", "券商"),
            Map.entry("ARCHIVE", "归档"), Map.entry("CASH", "资金"),
            Map.entry("CLOSE", "期末"), Map.entry("CLOSED", "已关闭"),
            Map.entry("COMMISSION", "佣金"), Map.entry("CUSTODY", "托管"),
            Map.entry("COMPLETE", "资料齐全"), Map.entry("CONFIRMED", "已确认"),
            Map.entry("DATA", "资料"), Map.entry("DELIVERY", "交付"),
            Map.entry("DEDUCT", "扣减"),
            Map.entry("GROSS", "成交毛额"), Map.entry("HOLDING", "持仓"),
            Map.entry("IN", "转入"), Map.entry("INCREASE", "增加"),
            Map.entry("KIND", "实物"),
            Map.entry("MOVEMENT", "变动"), Map.entry("PROVIDER", "提供方"),
            Map.entry("NORMAL", "正常"), Map.entry("PARSED", "已解析"),
            Map.entry("READY", "可以继续处理"), Map.entry("RECEIVED", "资料已收到"),
            Map.entry("RESERVE", "备付金"), Map.entry("REVIEWER", "复核"),
            Map.entry("RESULT", "结果"), Map.entry("RETURN", "返还"),
            Map.entry("ROLE", "角色"), Map.entry("SETTLEMENT", "交收"),
            Map.entry("SHARE", "份额"), Map.entry("SNAPSHOT", "快照"),
            Map.entry("SOURCE", "来源"), Map.entry("STATE", "状态"),
            Map.entry("SUBSTITUTE", "替代"), Map.entry("VALUATION", "估值"),
            Map.entry("TRANSFER", "转移"),
            Map.entry("WORKER", "经办"));

    private static final Map<String, String> LOWER_WORD_LABELS = Map.ofEntries(
            Map.entry("actual", "实际"), Map.entry("amount", "金额"),
            Map.entry("approved", "批准"),
            Map.entry("available", "可用"), Map.entry("balance", "余额"),
            Map.entry("basket", "篮子"), Map.entry("cash", "资金"),
            Map.entry("closing", "期末"), Map.entry("commission", "佣金"),
            Map.entry("confirm", "确认"), Map.entry("confirmed", "已确认"),
            Map.entry("cost", "成本"), Map.entry("count", "条数"),
            Map.entry("date", "日期"), Map.entry("delivery", "交付"),
            Map.entry("difference", "差额"), Map.entry("diff", "差额"),
            Map.entry("event", "事件"), Map.entry("external", "外部"),
            Map.entry("fee", "费用"), Map.entry("field", "字段"),
            Map.entry("final", "最终"), Map.entry("gross", "毛额"),
            Map.entry("holding", "持仓"), Map.entry("initial", "初始"),
            Map.entry("instruction", "指令"), Map.entry("internal", "内部"),
            Map.entry("key", "标识"), Map.entry("ledger", "台账"),
            Map.entry("mapped", "已对应"), Map.entry("market", "市场"),
            Map.entry("movement", "变动"), Map.entry("nav", "净值"),
            Map.entry("opening", "期初"), Map.entry("parse", "解析"),
            Map.entry("parsed", "已解析"), Map.entry("payment", "支付"),
            Map.entry("posting", "入账"), Map.entry("price", "价格"),
            Map.entry("quantity", "数量"), Map.entry("rate", "费率"),
            Map.entry("receivable", "应收"), Map.entry("record", "记录"),
            Map.entry("redemption", "赎回"), Map.entry("reinvest", "再投资"),
            Map.entry("remaining", "待结余额"), Map.entry("reserve", "备付金"),
            Map.entry("result", "结果"), Map.entry("return", "返还"),
            Map.entry("row", "行"), Map.entry("security", "证券"),
            Map.entry("settlement", "交收"), Map.entry("share", "份额"),
            Map.entry("snapshot", "快照"), Map.entry("source", "来源"),
            Map.entry("state", "状态"), Map.entry("status", "状态"),
            Map.entry("subscription", "申购"), Map.entry("substitution", "替代"),
            Map.entry("total", "合计"), Map.entry("unit", "单位"),
            Map.entry("valuation", "估值"), Map.entry("version", "版本"),
            Map.entry("calculated", "计算"), Map.entry("formula", "公式"),
            Map.entry("open", "期初"), Map.entry("ta", "TA"),
            Map.entry("irr", "内部收益率（IRR）"),
            Map.entry("adjustment", "调整"), Map.entry("answer", "答案"),
            Map.entry("archive", "归档"), Map.entry("base", "基数"),
            Map.entry("capital", "实收资本"), Map.entry("card", "知识卡"),
            Map.entry("chain", "链"), Map.entry("check", "检查"),
            Map.entry("clearing", "清算"), Map.entry("code", "代码"),
            Map.entry("comprehensive", "综合实务"), Map.entry("confirmation", "确认"),
            Map.entry("consideration", "申赎对价"), Map.entry("content", "内容"),
            Map.entry("creation", "创设"), Map.entry("day", "当日"),
            Map.entry("delivered", "已交付"), Map.entry("delta", "差额"),
            Map.entry("direction", "方向"),
            Map.entry("dividend", "分红"), Map.entry("downstream", "下游"),
            Map.entry("entry", "分录"), Map.entry("entries", "分录"),
            Map.entry("estimate", "估计"),
            Map.entry("estimated", "估计"),
            Map.entry("execution", "执行"), Map.entry("expected", "预计"),
            Map.entry("fof", "FOF"), Map.entry("id", "标识"),
            Map.entry("input", "输入"), Map.entry("issued", "已发行"),
            Map.entry("item", "项目"), Map.entry("mapping", "对应关系"),
            Map.entry("material", "资料"), Map.entry("minute", "分钟"),
            Map.entry("normal", "正常"), Map.entry("note", "说明"),
            Map.entry("object", "对象"), Map.entry("ole", "OLE"),
            Map.entry("option", "选项"), Map.entry("order", "顺序"),
            Map.entry("pcf", "PCF"), Map.entry("per", "每"),
            Map.entry("policy", "口径"), Map.entry("post", "处理后"),
            Map.entry("pre", "处理前"), Map.entry("premium", "溢价"),
            Map.entry("prepayment", "预付款"), Map.entry("primary", "一级市场"),
            Map.entry("product", "产品"), Map.entry("question", "题目"),
            Map.entry("recon", "勾稽"), Map.entry("redeemed", "已赎回"),
            Map.entry("reference", "参考"), Map.entry("refund", "退回"),
            Map.entry("required", "必需"), Map.entry("route", "路线"),
            Map.entry("same", "同一"), Map.entry("secondary", "二级市场"),
            Map.entry("securities", "证券"), Map.entry("settled", "已结算"),
            Map.entry("signed", "带方向"), Map.entry("sub", "替代"),
            Map.entry("submission", "提交"),
            Map.entry("text", "文本"), Map.entry("traded", "已交易"),
            Map.entry("underlying", "底层"), Map.entry("unsettled", "待结算"),
            Map.entry("upstream", "上游"), Map.entry("value", "价值"),
            Map.entry("view", "视图"), Map.entry("voucher", "凭证"),
            Map.entry("work", "工作"));

    /**
     * Stable learner-facing labels for the state values used by current
     * business materials.  Keep longer values before their shorter pieces so
     * NORMAL_CLOSE is not partially rewritten as NORMAL.
     */
    private static final List<Map.Entry<String, String>> BUSINESS_STATE_LABELS = List.of(
            Map.entry("ADDITIONAL_PAYMENT_FROM_AP", "申赎参与人补款"),
            Map.entry("RETURN_TO_AP", "退回申赎参与人"),
            Map.entry("ESTIMATE_ADJUSTMENT", "估计金额调整"),
            Map.entry("ACTUAL_COST", "实际成本"),
            Map.entry("CARRY_FORWARD", "结转"),
            Map.entry("SECURITIES_IN", "证券转入"),
            Map.entry("CONSIDERATION", "申赎对价"),
            Map.entry("IN_KIND", "实物交付"),
            Map.entry("CASH_IN", "资金流入"),
            Map.entry("RECEIPT", "到账"),
            Map.entry("INCREASE", "增加"),
            Map.entry("TRANSFER", "转移"),
            Map.entry("DEDUCT", "扣减"),
            Map.entry("BALANCE", "余额"),
            Map.entry("PASS", "校验通过"),
            Map.entry("POST", "登记"),
            Map.entry("READ", "读取"),
            Map.entry("SUBSTITUTION_SETTLED", "现金替代已结算"),
            Map.entry("SECURITIES_SETTLED", "证券已交收"),
            Map.entry("SYNTHETIC_EDUCATIONAL", "合成教学资料"),
            Map.entry("NO_CASH_SUBSTITUTION", "不使用现金替代"),
            Map.entry("MUST_CASH_SUBSTITUTION", "必须现金替代"),
            Map.entry("ALLOWED_CASH_SUBSTITUTION", "允许现金替代"),
            Map.entry("SZHK_TZXX", "深港通权益通知数据"),
            Map.entry("HK_SJSMX2", "港股通结算明细数据"),
            Map.entry("ROUND", "四舍五入"),
            Map.entry("SSE", "上海证券交易所"),
            Map.entry("SZSE", "深圳证券交易所"),
            Map.entry("RECONCILED_NORMAL_CLOSE", "已对账并正常封账"),
            Map.entry("NORMAL_ARCHIVED", "已正常归档"),
            Map.entry("NORMAL_CLOSE", "正常封账"),
            Map.entry("EXCLUDED_BY_EVIDENCE", "按资料证据排除"),
            Map.entry("HOLDING_RECONCILED", "持仓已对账"),
            Map.entry("RESULT_RECONCILED", "结果已对账"),
            Map.entry("SHARES_POSTED", "份额已登记"),
            Map.entry("NAV_CONFIRMED", "净值已确认"),
            Map.entry("BANK-STATEMENT", "银行流水"),
            Map.entry("CLOSE_NORMAL", "可正常封账"),
            Map.entry("TRADE_DAY", "交易日"),
            Map.entry("PAYMENT_DAY", "支付日"),
            Map.entry("BALANCED", "勾稽一致"),
            Map.entry("UNBALANCED", "仍有差异"),
            Map.entry("MATCHED", "来源已核对"),
            Map.entry("ACCOUNTED", "已入账"),
            Map.entry("RECEIVED", "资料已收到"),
            Map.entry("PARSED", "资料已读入"),
            Map.entry("MAPPED", "来源已对应"),
            Map.entry("COMPLETE", "资料已齐全"),
            Map.entry("READY", "可以继续处理"),
            Map.entry("NORMAL", "正常"),
            Map.entry("HOLD_REVIEW", "暂缓处理"));

    private HumanFeedbackText() {
    }

    static String publicDisplayText(String text) {
        return publicLabel(text);
    }

    static String reviewerEvidence(JsonNode item, boolean matched) {
        String focus = safeFeedbackFocus(item.path("description").asText(""),
                item.path("evidenceRequirement").asText(""));
        if (focus.isBlank()) {
            focus = "对应资料字段、金额或计算关系";
        }
        if (matched) {
            return "已对照资料核对：" + focus + "。";
        }
        return "这次作答还对不上资料：" + focus
                + "。请回到对应资料，检查字段、金额、状态、计算或勾稽关系。";
    }

    static String unreadableSubmission() {
        return "没有读到本次提交的工作纸内容。请检查各项字段后重新提交。";
    }

    /**
     * Keep useful model wording only when it is business-specific and safe;
     * otherwise use deterministic text so a weak model response never reaches
     * the learner as evaluator jargon or an answer key.
     */
    static String normalizeModelEvidence(String candidate, JsonNode item, boolean matched,
                                         JsonNode referenceAnswer, JsonNode learnerAnswer) {
        String rawValue = candidate == null ? "" : candidate.trim();
        if (!containsReferenceOnlyAnswer(rawValue, referenceAnswer, learnerAnswer)) {
            String publicValue = publicLabel(rawValue);
            if (isHumanEvidence(publicValue)) {
                return publicValue;
            }
        }
        return reviewerEvidence(item, matched);
    }

    /** Final guard for historical snapshots and any reviewer implementation. */
    static String publicEvidence(String description, String candidate, boolean matched) {
        String value = publicLabel(candidate == null ? "" : candidate.trim());
        if (isHumanEvidence(value)) {
            return value;
        }
        String focus = safeFeedbackFocus(description, "");
        if (focus.isBlank()) {
            focus = "对应资料字段、金额或计算关系";
        }
        return matched
                ? "已对照资料核对：" + focus + "。"
                : "这次作答还对不上资料：" + focus
                        + "。请回到对应资料，检查字段、金额、状态、计算或勾稽关系。";
    }

    static String incorrectPracticeExplanation(JsonNode question) {
        String focus = questionFocus(question);
        if ("SHORT_TEXT".equals(question.path("type").asText())) {
            if (focus.isBlank()) {
                focus = "业务结论";
            }
            return "结论里还有信息没有和资料对上。请回到“" + focus
                    + "”，补齐关键金额、业务结果和勾稽或状态结论。";
        }
        if (focus.isBlank()) {
            return "这次作答还没有和资料对上。请重新核对来源字段、金额和业务状态。";
        }
        return "这次填写还没有和资料对上。请回到“" + focus
                + "”，先核对字段来源，再检查金额、方向、科目或状态。";
    }

    static String correctPracticeExplanation(JsonNode question) {
        String explanation = publicLabel(question.path("explanation").asText(""));
        return explanation.isBlank()
                ? "已按资料核对当前字段、计算或业务状态。"
                : explanation;
    }

    static String practiceHint(JsonNode question) {
        return switch (question.path("type").asText()) {
            case "FIELD_MAP" -> "先按资料来源逐行核对字段，再判断方向、状态或确认时点。";
            case "CALCULATION" -> "先从资料字段取数，把直接取数项和需要复算的结果分开，再按给出的关系计算。";
            case "LEDGER_ENTRY" -> "按借贷方向逐行核对科目；成本、费用、应付项和清算款分别登记。";
            case "RECONCILIATION" -> "先分别复算数量、成本、资金和估值，再检查各项差额与最终勾稽结论。";
            case "SHORT_TEXT" -> {
                String focus = questionFocus(question);
                yield focus.isBlank()
                        ? "把关键业务结果和勾稽或状态结论写在同一句话里。"
                        : "先把“" + focus + "”要求的各项结果写入结论，再检查勾稽或状态表述。";
            }
            default -> {
                String hint = question.path("hints").path(0).asText("").trim();
                yield hint.isBlank()
                        ? "先回到资料，核对业务对象、来源和处理顺序。"
                        : redactNumberLiterals(publicLabel(hint));
            }
        };
    }

    static String remediationTitle(JsonNode target) {
        String title = publicLabel(target.path("title").asText(""));
        if (title.isBlank()) {
            return "核对本次作答的关键资料";
        }
        title = title.replaceFirst("^补学\\s*", "")
                .replace("可追溯", "可核对");
        return title.trim();
    }

    static String remediationReason(JsonNode target) {
        String reason = publicLabel(target.path("reason").asText(""));
        return reason.isBlank()
                ? "本次评分在对应资料或计算关系处还没有核对上。"
                : redactNumberLiterals(reason);
    }

    private static boolean isHumanEvidence(String value) {
        if (value.isBlank() || value.length() > 500) {
            return false;
        }
        for (String phrase : UNSAFE_PHRASES) {
            if (value.contains(phrase)) {
                return false;
            }
        }
        for (String label : INTERNAL_LABELS) {
            if (value.contains(label)) {
                return false;
            }
        }
        if (LOWER_CAMEL.matcher(value).find() || MIXED_CAMEL.matcher(value).find()) {
            return false;
        }
        if (value.matches("^[\\s、，。.!！？:：;；'\"“”‘’]*(证据|答案|说明|正确|错误|已完成|已满足)[\\s、，。.!！？:：;；'\"“”‘’]*$")) {
            return false;
        }
        Matcher tokenMatcher = UPPER_TOKEN.matcher(value);
        while (tokenMatcher.find()) {
            if (!PUBLIC_ABBREVIATIONS.contains(tokenMatcher.group())) {
                return false;
            }
        }
        return BUSINESS_ANCHORS.stream().anyMatch(value::contains);
    }

    private static boolean containsReferenceOnlyAnswer(String candidate, JsonNode referenceAnswer,
                                                        JsonNode learnerAnswer) {
        if (referenceAnswer == null || referenceAnswer.isMissingNode() || referenceAnswer.isNull()) {
            return false;
        }
        String learner = learnerAnswer == null ? "" : learnerAnswer.toString();
        String reference = referenceAnswer.toString();
        Matcher numberMatcher = NUMBER.matcher(reference);
        while (numberMatcher.find()) {
            String token = numberMatcher.group();
            if (token.replaceAll("[^0-9]", "").length() >= 2
                    && containsNormalized(candidate, token)
                    && !containsNormalized(learner, token)) {
                return true;
            }
        }
        Matcher stateMatcher = UPPER_TOKEN.matcher(reference);
        while (stateMatcher.find()) {
            String token = stateMatcher.group();
            if (containsNormalized(candidate, token) && !containsNormalized(learner, token)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsNormalized(String text, String token) {
        String normalizedText = text.replace(",", "").replace("，", "")
                .replace(" ", "").replace("　", "");
        String normalizedToken = token.replace(",", "").replace("，", "")
                .replace(" ", "").replace("　", "");
        return normalizedText.contains(normalizedToken);
    }

    private static String questionFocus(JsonNode question) {
        String type = question.path("type").asText();
        List<String> labels = new ArrayList<>();
        String arrayName = switch (type) {
            case "FIELD_MAP" -> "fieldMappings";
            case "CALCULATION" -> "calculation";
            case "LEDGER_ENTRY" -> "ledgerEntries";
            case "RECONCILIATION" -> "reconciliation";
            default -> "";
        };
        JsonNode fields = switch (type) {
            case "FIELD_MAP" -> question.path(arrayName);
            case "CALCULATION", "RECONCILIATION" -> question.path(arrayName).path("fields");
            case "LEDGER_ENTRY" -> question.path(arrayName);
            default -> question.path("textInput");
        };
        if (fields.isArray()) {
            for (JsonNode field : fields) {
                String label = field.path("label").asText("").trim();
                if (!label.isBlank()) {
                    labels.add(redactNumberLiterals(publicLabel(label)));
                }
                if (labels.size() == 4) {
                    break;
                }
            }
        } else if (fields.isObject()) {
            String label = fields.path("label").asText("").trim();
            if (!label.isBlank()) {
                labels.add(redactNumberLiterals(publicLabel(label)));
            }
        }
        if (!labels.isEmpty()) {
            String result = String.join("、", labels);
            return fields.isArray() && fields.size() > labels.size() ? result + "等字段" : result;
        }
        return redactNumberLiterals(publicLabel(question.path("prompt").asText("")));
    }

    private static String publicFocus(String preferred, String fallback) {
        String value = preferred == null ? "" : preferred.trim();
        if (value.isBlank()) {
            value = fallback == null ? "" : fallback.trim();
        }
        return publicLabel(value);
    }

    private static String safeFeedbackFocus(String preferred, String fallback) {
        return redactNumberLiterals(publicFocus(preferred, fallback));
    }

    /**
     * Remove answer-like numeric literals from reviewer fallback text without
     * replacing them with an artificial placeholder.  The surrounding field
     * or calculation wording remains, so the learner gets a useful next step.
     */
    private static String redactNumberLiterals(String text) {
        String value = text == null ? "" : text;
        value = NUMBER_WITH_UNIT.matcher(value).replaceAll("");
        value = value.replaceAll("[+×÷=]", " ");
        value = value.replace("计算为", "计算结果")
                .replace("结果为", "结果")
                .replace("金额为", "金额")
                .replace("余额为", "余额")
                .replace("数量为", "数量")
                .replace("份额为", "份额")
                .replace("净值为", "净值")
                .replace("净资产为", "净资产")
                .replace("市值为", "市值")
                .replace("成本为", "成本")
                .replace("差额为", "差额")
                .replace("期间为", "期间")
                .replace("日期为", "日期")
                .replace("比例为", "比例")
                .replace("费率为", "费率")
                .replace("现金为", "现金")
                .replace("资金为", "资金")
                .replace("资产为", "资产")
                .replace("负债为", "负债")
                .replace("本金为", "本金")
                .replace("收益为", "收益")
                .replace("精度小数", "精度")
                .replace("保留小数", "保留小数位");
        return value.replaceAll("\\s+", " ")
                .replaceAll("\\s+([，。、；：])", "$1")
                .replaceAll("([，。、；：])\\s+", "$1")
                .replaceAll("[，、；：]([，、；：])", "$1")
                .trim();
    }

    private static String publicLabel(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String value = text.replace('\r', ' ').replace('\n', ' ').replaceAll("\\s+", " ").trim();
        value = value.replace("FIELD_MAP", "字段来源").replace("CALCULATION", "数值计算")
                .replace("LEDGER_ENTRY", "凭证科目").replace("RECONCILIATION", "勾稽核对")
                .replace("SHORT_TEXT", "业务结论");
        value = replaceHyphenCodes(value);
        for (Map.Entry<String, String> state : BUSINESS_STATE_LABELS) {
            value = value.replaceAll("(?<![A-Za-z0-9_])" + Pattern.quote(state.getKey())
                            + "(?![A-Za-z0-9_])", Matcher.quoteReplacement(state.getValue()));
        }
        for (Map.Entry<String, String> label : INLINE_TECHNICAL_LABELS.entrySet()) {
            value = value.replaceAll("(?<![A-Za-z0-9])" + Pattern.quote(label.getKey())
                            + "(?=\\d|[^A-Za-z0-9]|$)",
                    Matcher.quoteReplacement(label.getValue()));
        }
        value = replaceLowerCamel(value);
        value = replaceMixedCamel(value);
        for (String label : INTERNAL_LABELS) {
            value = value.replace(label, "业务字段");
        }
        value = value.replace("TA closing shares", "TA 期末份额")
                .replace("内部 closing shares", "内部期末份额")
                .replace("internal closing shares", "内部期末份额")
                .replace("approved valuation", "批准估值")
                .replace("hk_jsmx", "港股通结算明细数据")
                .replace("reserve movement", "备付金变动")
                .replace("reserve close", "期末备付金")
                .replaceAll("(?i)\\breserve(?=[\\u3400-\\u9fff]|\\b)", "备付金")
                .replace("market value", "市值")
                .replace("source snapshot", "来源快照")
                .replace("delivery choice", "交付方式")
                .replace("posting count", "入账次数")
                .replace("cash diff", "资金差额")
                .replace("holding diff", "持仓差额")
                .replace("valuation diff", "估值差额")
                .replace("shares diff", "份额差额")
                .replace("return diff", "返还差额")
                .replaceAll("(?<![A-Za-z0-9])status(?![A-Za-z0-9])", "状态")
                .replaceAll("(?<![A-Za-z0-9])state(?![A-Za-z0-9])", "状态")
                .replaceAll("(?<![A-Za-z])R\\d+(?![A-Za-z0-9])", "当前处理步骤");
        value = replaceUpperTokens(value);
        value = value.replaceAll("\\s+([，。、；：])", "$1").replaceAll("([，。、；：])\\s+", "$1");
        return value.trim();
    }

    private static String replaceUpperTokens(String value) {
        Matcher matcher = UPPER_TOKEN.matcher(value);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String token = matcher.group();
            boolean numberedAbbreviation = PUBLIC_ABBREVIATIONS.stream()
                    .anyMatch(item -> token.startsWith(item)
                            && token.substring(item.length()).matches("\\d+"));
            if (PUBLIC_ABBREVIATIONS.contains(token) || numberedAbbreviation) {
                matcher.appendReplacement(result, Matcher.quoteReplacement(token));
                continue;
            }
            if (token.matches("[PSIT]\\d+(?:R\\d+)?")) {
                matcher.appendReplacement(result, Matcher.quoteReplacement("资料位置 " + token));
                continue;
            }
            String[] words = token.split("_");
            List<String> labels = new ArrayList<>();
            for (String word : words) {
                String label = UPPER_WORD_LABELS.get(word);
                if (label != null) {
                    labels.add(label);
                }
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(
                    labels.isEmpty() ? "业务资料标识" : String.join("·", labels)));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private static String replaceLowerCamel(String value) {
        Matcher matcher = LOWER_CAMEL.matcher(value);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String token = matcher.group();
            String exact = INLINE_TECHNICAL_LABELS.get(token);
            if (exact != null) {
                matcher.appendReplacement(result, Matcher.quoteReplacement(exact));
                continue;
            }
            String[] words = token.replaceAll("([a-z0-9])([A-Z])", "$1-$2")
                    .toLowerCase().split("-");
            List<String> labels = new ArrayList<>();
            boolean known = true;
            for (String word : words) {
                String singular = word.endsWith("s") ? word.substring(0, word.length() - 1) : word;
                String label = LOWER_WORD_LABELS.getOrDefault(word, LOWER_WORD_LABELS.get(singular));
                if (label == null) {
                    known = false;
                    break;
                }
                labels.add(label);
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(
                    known ? String.join("", labels) : "业务字段"));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private static String replaceMixedCamel(String value) {
        Matcher matcher = MIXED_CAMEL.matcher(value);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String token = matcher.group();
            String exact = INLINE_TECHNICAL_LABELS.get(token);
            if (exact != null) {
                matcher.appendReplacement(result, Matcher.quoteReplacement(exact));
                continue;
            }
            String[] words = token.replaceAll("([A-Z]+)([A-Z][a-z])", "$1-$2")
                    .replaceAll("([a-z0-9])([A-Z])", "$1-$2")
                    .toLowerCase().split("-");
            List<String> labels = new ArrayList<>();
            boolean known = true;
            for (String word : words) {
                String singular = word.endsWith("s") ? word.substring(0, word.length() - 1) : word;
                String label = LOWER_WORD_LABELS.getOrDefault(word, LOWER_WORD_LABELS.get(singular));
                if (label == null) {
                    known = false;
                    break;
                }
                labels.add(label);
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(
                    known ? String.join("", labels) : "业务字段"));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private static String replaceHyphenCodes(String value) {
        Matcher matcher = HYPHEN_CODE.matcher(value);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String token = matcher.group();
            String label;
            if (token.equals("T-1")) {
                label = token;
            } else if (token.equals("FOF-02")) {
                label = "FOF 申购路线";
            } else {
                Matcher locator = Pattern.compile("[AB]-[PIT]\\d+").matcher(token);
                List<String> locations = new ArrayList<>();
                while (locator.find()) {
                    locations.add(locator.group());
                }
                if (!locations.isEmpty()) {
                    label = "材料位置 " + String.join(" 至 ", locations);
                } else if (token.contains("XBRL")) {
                label = "XBRL 资料标识";
                } else if (token.contains("CASH")) {
                    label = "资金资料标识";
                } else if (token.contains("NAV")) {
                    label = "净值资料标识";
                } else if (token.contains("TA")) {
                    label = "TA 资料标识";
                } else {
                    label = "业务资料标识";
                }
            }
            Matcher suffix = Pattern.compile("(?:^|-)(\\d+)(?:-|$)").matcher(token);
            String lastNumber = "";
            while (suffix.find()) {
                lastNumber = suffix.group(1);
            }
            if (!lastNumber.isBlank()) {
                label += " " + lastNumber;
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(label));
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
