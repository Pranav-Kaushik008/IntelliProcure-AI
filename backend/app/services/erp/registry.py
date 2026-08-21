"""
IntelliProcure AI – ERP Integration Registry & Factory
Central factory for resolving and instantiating configured ERP adapters.
Supports Oracle ERP Cloud, SAP S/4HANA, Microsoft Dynamics 365, and Mock Development Adapter.
Ensures no external calls or fake claims if credentials are not configured.
"""

import os
import logging
from typing import Dict, Type
from app.services.erp.base import ERPAdapter
from app.services.erp.mock_adapter import MockERPAdapter
from app.services.erp.oracle_adapter import OracleERPAdapter
from app.services.erp.sap_adapter import SAPERPAdapter
from app.services.erp.dynamics_adapter import DynamicsERPAdapter

logger = logging.getLogger("intelliprocure")


class ERPAdapterRegistry:
    """
    Factory & Registry for ERP Adapters.
    Reads environment settings to instantiate the appropriate adapter.
    Falls back gracefully to MockERPAdapter if provider is 'mock' or credentials are missing.
    """

    _registry: Dict[str, Type[ERPAdapter]] = {
        "MOCK": MockERPAdapter,
        "ORACLE_CLOUD": OracleERPAdapter,
        "SAP_S4HANA": SAPERPAdapter,
        "DYNAMICS_365": DynamicsERPAdapter,
    }

    @classmethod
    def get_adapter(cls, provider_name: str = None) -> ERPAdapter:
        """
        Instantiate active ERP adapter based on provider_name or environment setting.
        """
        provider = (provider_name or os.getenv("ERP_PROVIDER", "MOCK")).upper()

        if provider == "ORACLE_CLOUD":
            url = os.getenv("ORACLE_ERP_BASE_URL", "")
            user = os.getenv("ORACLE_ERP_USERNAME", "")
            pwd = os.getenv("ORACLE_ERP_PASSWORD", "")
            adapter = OracleERPAdapter(base_url=url, username=user, password=pwd)
            if adapter.is_mock:
                logger.info("Oracle ERP Cloud credentials missing. Falling back to Mock ERP Adapter.")
                return MockERPAdapter()
            return adapter

        elif provider == "SAP_S4HANA":
            host = os.getenv("SAP_HOST", "")
            client = os.getenv("SAP_CLIENT", "")
            key = os.getenv("SAP_API_KEY", "")
            user = os.getenv("SAP_USERNAME", "")
            pwd = os.getenv("SAP_PASSWORD", "")
            adapter = SAPERPAdapter(host=host, client=client, api_key=key, username=user, password=pwd)
            if adapter.is_mock:
                logger.info("SAP S/4HANA credentials missing. Falling back to Mock ERP Adapter.")
                return MockERPAdapter()
            return adapter

        elif provider == "DYNAMICS_365":
            url = os.getenv("DYNAMICS_RESOURCE_URL", "")
            tenant = os.getenv("DYNAMICS_TENANT_ID", "")
            client_id = os.getenv("DYNAMICS_CLIENT_ID", "")
            secret = os.getenv("DYNAMICS_CLIENT_SECRET", "")
            adapter = DynamicsERPAdapter(resource_url=url, tenant_id=tenant, client_id=client_id, client_secret=secret)
            if adapter.is_mock:
                logger.info("Microsoft Dynamics 365 credentials missing. Falling back to Mock ERP Adapter.")
                return MockERPAdapter()
            return adapter

        else:
            return MockERPAdapter()

    @classmethod
    def list_providers(cls) -> Dict[str, str]:
        return {
            "MOCK": "Mock Development Sandbox (No external credentials required)",
            "ORACLE_CLOUD": "Oracle ERP Cloud REST API",
            "SAP_S4HANA": "SAP S/4HANA OData / NetWeaver API",
            "DYNAMICS_365": "Microsoft Dynamics 365 Finance & Operations Web API"
        }
