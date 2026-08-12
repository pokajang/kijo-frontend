import React, { useMemo, useState } from 'react'
import { CButton, CCollapse } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight } from '@coreui/icons'
import { DataTableEmbeddedList, DataTableStatusBadge } from '../../../../../components/datatable'
import {
  formatContributionMoney,
  getProjectStatusLabel,
  getProjectStatusTone,
} from '../clientFirstTouchUtils'

const ProjectSalesCreditTable = ({ projects = [], onOpenProject }) => {
  const [detailsVisible, setDetailsVisible] = useState(false)
  const totals = useMemo(
    () =>
      projects.reduce(
        (result, project) => ({
          awarded: result.awarded + Number(project.awarded || 0),
          invoiced: result.invoiced + Number(project.invoiced || 0),
          collected: result.collected + Number(project.collected || 0),
          grossProfit: result.grossProfit + Number(project.grossProfit || 0),
        }),
        { awarded: 0, invoiced: 0, collected: 0, grossProfit: 0 },
      ),
    [projects],
  )

  const columns = [
    { key: 'name', label: 'Project / job', width: '240px' },
    {
      key: 'awarded',
      label: 'Awarded',
      align: 'right',
      width: '130px',
      render: (project) => formatContributionMoney(project.awarded),
    },
    {
      key: 'invoiced',
      label: 'Invoiced',
      align: 'right',
      width: '130px',
      render: (project) => formatContributionMoney(project.invoiced),
    },
    {
      key: 'collected',
      label: 'Collected',
      align: 'right',
      width: '130px',
      render: (project) => formatContributionMoney(project.collected),
    },
    {
      key: 'grossProfit',
      label: 'Gross profit',
      align: 'right',
      width: '130px',
      render: (project) => formatContributionMoney(project.grossProfit),
    },
    {
      key: 'salesOwner',
      label: 'Sales credit',
      width: '190px',
      render: (project) =>
        project.salesOwner ? (
          <div className="first-touch-sales-owner">
            <span className="first-touch-sales-owner__avatar" aria-hidden="true">
              {project.salesOwnerCode || project.salesOwner.slice(0, 2)}
            </span>
            <span>{project.salesOwner}</span>
          </div>
        ) : (
          'Unassigned'
        ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      width: '130px',
      render: (project) => (
        <DataTableStatusBadge tone={getProjectStatusTone(project.status)}>
          {getProjectStatusLabel(project.status)}
        </DataTableStatusBadge>
      ),
    },
    {
      key: 'action',
      label: '',
      align: 'right',
      width: '56px',
      render: (project) => (
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          aria-label={`Open ${project.name}`}
          onClick={() => onOpenProject(project)}
        >
          <CIcon icon={cilArrowRight} aria-hidden="true" />
        </CButton>
      ),
    },
  ]

  const footerRows = projects.length
    ? [
        {
          key: 'totals',
          className: 'fw-semibold',
          cells: [
            { key: 'name', content: 'Shown project totals' },
            { key: 'awarded', content: formatContributionMoney(totals.awarded), align: 'right' },
            { key: 'invoiced', content: formatContributionMoney(totals.invoiced), align: 'right' },
            {
              key: 'collected',
              content: formatContributionMoney(totals.collected),
              align: 'right',
            },
            {
              key: 'grossProfit',
              content: formatContributionMoney(totals.grossProfit),
              align: 'right',
            },
            { key: 'salesOwner', content: '' },
            { key: 'status', content: '' },
            { key: 'action', content: '' },
          ],
        },
      ]
    : []

  if (!projects.length) return null

  const detailsId = 'client-first-touch-project-credit-details'

  return (
    <section
      className="first-touch-project-disclosure"
      aria-labelledby="first-touch-project-credit-title"
    >
      <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div>
          <h2 id="first-touch-project-credit-title" className="h6 mb-1">
            Project-level sales credit
          </h2>
          <p className="small text-muted mb-0">Review the project figures behind the summary.</p>
        </div>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          aria-expanded={detailsVisible}
          aria-controls={detailsId}
          onClick={() => setDetailsVisible((visible) => !visible)}
        >
          {detailsVisible
            ? 'Hide project detail'
            : `View project-level sales credit (${projects.length})`}
        </CButton>
      </div>

      <CCollapse id={detailsId} visible={detailsVisible}>
        <div className="mt-3">
          <DataTableEmbeddedList
            rows={projects}
            columns={columns}
            footerRows={footerRows}
            renderMobileFooterItem={() => (
              <div className="data-table-mobile-item first-touch-project-totals-mobile">
                <div className="fw-semibold mb-2">Shown project totals</div>
                <dl className="first-touch-mobile-metrics mb-0">
                  <div>
                    <dt>Awarded</dt>
                    <dd>{formatContributionMoney(totals.awarded)}</dd>
                  </div>
                  <div>
                    <dt>Invoiced</dt>
                    <dd>{formatContributionMoney(totals.invoiced)}</dd>
                  </div>
                  <div>
                    <dt>Collected</dt>
                    <dd>{formatContributionMoney(totals.collected)}</dd>
                  </div>
                  <div>
                    <dt>Gross profit</dt>
                    <dd>{formatContributionMoney(totals.grossProfit)}</dd>
                  </div>
                </dl>
              </div>
            )}
            getRowKey={(project) => project.id}
            emptyMessage="No awarded projects or jobs found for this client."
            renderMobileItem={(project) => (
              <article className="data-table-mobile-item first-touch-project-mobile">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div className="fw-semibold">{project.name}</div>
                    <div className="small text-muted mt-1">
                      Collected {formatContributionMoney(project.collected)}
                    </div>
                  </div>
                  <DataTableStatusBadge tone={getProjectStatusTone(project.status)}>
                    {getProjectStatusLabel(project.status)}
                  </DataTableStatusBadge>
                </div>
                <dl className="first-touch-mobile-metrics mt-3 mb-3">
                  <div>
                    <dt>Awarded</dt>
                    <dd>{formatContributionMoney(project.awarded)}</dd>
                  </div>
                  <div>
                    <dt>Gross profit</dt>
                    <dd>{formatContributionMoney(project.grossProfit)}</dd>
                  </div>
                  <div>
                    <dt>Sales credit</dt>
                    <dd>{project.salesOwner || 'Unassigned'}</dd>
                  </div>
                </dl>
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenProject(project)}
                >
                  Open project
                </CButton>
              </article>
            )}
          />
        </div>
      </CCollapse>
    </section>
  )
}

export default ProjectSalesCreditTable
