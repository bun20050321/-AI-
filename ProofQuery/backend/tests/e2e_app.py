from proofquery.app import create_app
from proofquery.config import Settings
from proofquery.evidence import EvidenceBuilder
from proofquery.models import ChartEncoding, ChartSpec, QueryEvidence, RunEvent
from proofquery.query import execute_query


settings = Settings(
    openai_api_key="e2e-key",
    openai_model="e2e-model",
    query_timeout_seconds=2,
)


class DeterministicAgent:
    async def run(self, session, question, emit, history=None):
        await emit(RunEvent(type="progress", stage="planning", message="正在规划分析"))
        await emit(RunEvent(type="progress", stage="querying", message="正在执行只读查询"))
        primary_sql = (
            "select region, sum(revenue) total from dataset "
            "group by region order by region"
        )
        primary = QueryEvidence(
            sql=primary_sql,
            result=await execute_query(session, primary_sql, settings),
        )
        await emit(RunEvent(type="progress", stage="charting", message="正在生成图表"))
        chart = ChartSpec(
            mark="bar",
            x=ChartEncoding(field="region", type="nominal", title="Region"),
            y=ChartEncoding(field="total", type="quantitative", title="Revenue"),
            title="Revenue by region",
        )
        await emit(RunEvent(type="progress", stage="verifying", message="正在独立验证结果"))
        verification_sql = (
            "select sum(revenue) total from dataset where region = 'East'"
        )
        verification = QueryEvidence(
            sql=verification_sql,
            result=await execute_query(session, verification_sql, settings),
        )
        await emit(RunEvent(type="progress", stage="complete", message="分析完成"))
        return EvidenceBuilder().finalize(
            conclusion="East revenue was 300.",
            primary=primary,
            verification=verification,
            numeric_claims=[300],
            chart=chart,
        )


app = create_app(settings=settings, agent=DeterministicAgent())
